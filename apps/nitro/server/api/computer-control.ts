import puppeteer, { Browser, Page } from 'puppeteer'
import { installMouseHelper } from '../utils/mouseHelper'
import { installStepOverlay } from '../utils/stepOverlay'
import sharp from 'sharp'

// Store browser and page instances with their IDs
const browsers: Record<string, { browser: Browser; page: Page }> = {}

// Initialize browser and page if not already done
async function initBrowser(browserId: string = 'default') {
  // Return existing browser if it exists
  if (browsers[browserId]) {
    return browsers[browserId]
  }

  // Create new browser instance
  const browser = await puppeteer.launch({
    headless: false
  })
  const page = await browser.newPage()
  
  await page.setViewport({
    width: 1280,
    height: 800
  })
  
  // Install mouse helper and step overlay before navigation
  await installMouseHelper(page)
  await installStepOverlay(page)
  
  // Navigate to Google by default
  await page.goto('https://www.google.com', { waitUntil: 'networkidle0' })

  // Store the new browser instance
  browsers[browserId] = { browser, page }
  
  return browsers[browserId]
}

// Add cleanup function
async function closeBrowser(browserId: string) {
  if (browsers[browserId]) {
    const { browser } = browsers[browserId]
    await browser.close()
    delete browsers[browserId]
  }
}

// Key mapping for special keys
const KEY_MAPPING: Record<string, string> = {
  'Return': 'Enter',
  'Up': 'ArrowUp',
  'Down': 'ArrowDown',
  'Left': 'ArrowLeft',
  'Right': 'ArrowRight',
  'KP_0': 'Numpad0',
  'KP_1': 'Numpad1',
  'KP_2': 'Numpad2',
  'KP_3': 'Numpad3',
  'KP_4': 'Numpad4',
  'KP_5': 'Numpad5',
  'KP_6': 'Numpad6',
  'KP_7': 'Numpad7',
  'KP_8': 'Numpad8',
  'KP_9': 'Numpad9',
}

export default defineEventHandler(async (event) => {
  // Get action parameters from request body
  const body = await readBody(event)
  const { action, url, coordinates: rawCoordinates, text, browserId = 'default', overlayMessage } = body
  
  const config = useRuntimeConfig()
  const scaleFactor = Number(config.displayScaleFactor) ?? 1 // Default to 1 if not set
  
  // Scale up coordinates if they exist
  const coordinates = rawCoordinates ? {
    x: Math.round(rawCoordinates.x / scaleFactor),
    y: Math.round(rawCoordinates.y / scaleFactor)
  } : undefined

  if (!action) {
    throw createError({
      statusCode: 400,
      message: 'Action parameter is required'
    })
  }

  try {
    const { page } = await initBrowser(browserId)

    // Add overlay update if message is provided
    if (overlayMessage) {
      await page.evaluate((data) => {
        const overlay = document.getElementById('step-overlay')
        if (!overlay) return
        
        overlay.innerHTML = ''
        
        if (data.stepType) {
          const stepType = document.createElement('div')
          stepType.className = 'step-type'
          stepType.textContent = `Step: ${data.stepType}`
          overlay.appendChild(stepType)
        }

        if (data.message) {
          const message = document.createElement('div')
          message.className = 'message'
          message.textContent = data.message
          overlay.appendChild(message)
        }

        if (data.coordinates) {
          const coords = document.createElement('div')
          coords.className = 'coordinates'
          coords.textContent = `Coordinates: [${data.coordinates.join(', ')}]`
          overlay.appendChild(coords)
        }

        overlay.classList.add('active')
      }, overlayMessage)
    }

    switch (action) {
      case 'screenshot':
        // Add overlay message for screenshot
        await page.evaluate(() => {
          const overlay = document.getElementById('step-overlay')
          if (!overlay) return
          
          overlay.innerHTML = `
            <div class="step-type">Step: Screenshot</div>
            <div class="message">📸 Taking screenshot...</div>
            <div class="screenshot-flash"></div>
          `
          overlay.classList.add('active')
          
          // Add flash animation
          const style = document.createElement('style')
          style.textContent = `
            .screenshot-flash {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: white;
              opacity: 0;
              pointer-events: none;
              animation: flash 0.5s ease-out;
            }
            
            @keyframes flash {
              0% { opacity: 0; }
              50% { opacity: 0.3; }
              100% { opacity: 0; }
            }
          `
          document.head.appendChild(style)
        })

        // Only navigate if URL is provided
        if (url) {
          await page.goto(url, { waitUntil: 'networkidle0' })
        }
        
        // Wait briefly for flash animation
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Take the original screenshot as a Buffer
        const originalScreenshot = await page.screenshot({ 
          type: 'png',
          fullPage: false,
          encoding: null
        })
        
        // Get metadata to determine dimensions
        const metadata = await sharp(originalScreenshot).metadata()
        const newWidth = Math.round((metadata.width || 0) * scaleFactor)
        const newHeight = Math.round((metadata.height || 0) * scaleFactor)
        
        // Resize with Sharp while maintaining aspect ratio
        const resizedImageBuffer = await sharp(originalScreenshot)
          .resize(newWidth, newHeight, {
            withoutEnlargement: true
          })
          .toBuffer()
        
        return {
          type: 'image',
          data: resizedImageBuffer.toString('base64'),
          dimensions: {  // Add original dimensions to help with coordinate mapping
            original: {
              width: metadata.width,
              height: metadata.height
            },
            scaled: {
              width: newWidth,
              height: newHeight
            }
          }
        }

      case 'click':
        if (!coordinates) {
          throw createError({
            statusCode: 400,
            message: 'Coordinates are required for click action'
          })
        }
        await page.mouse.move(coordinates.x, coordinates.y)
        await page.mouse.click(coordinates.x, coordinates.y)
        return { success: true, message: 'Click performed' }

      case 'move':
        if (!coordinates) {
          throw createError({
            statusCode: 400,
            message: 'Coordinates are required for move action'
          })
        }
        await page.mouse.move(coordinates.x, coordinates.y)
        return { success: true, message: 'Cursor moved' }

      case 'type':
        if (!text) {
          throw createError({
            statusCode: 400,
            message: 'Text is required for type action'
          })
        }
        await page.keyboard.type(text)
        return { success: true, message: 'Text typed' }

      case 'close':
        await closeBrowser(browserId)
        return { success: true, message: 'Browser closed' }

      case 'key':
        if (!text) {
          throw createError({
            statusCode: 400,
            message: 'Key sequence is required for key action'
          })
        }
        
        // Handle key combinations (e.g., "ctrl+s")
        if (text.includes('+')) {
          const keys = text.split('+')
          const modifiers = keys.slice(0, -1).map(k => k.toLowerCase())
          const key = keys[keys.length - 1]
          
          // Press all modifiers
          for (const modifier of modifiers) {
            await page.keyboard.down(modifier)
          }
          
          // Press the main key
          const mappedKey = KEY_MAPPING[key] || key
          await page.keyboard.press(mappedKey)
          
          // Release modifiers in reverse order
          for (const modifier of modifiers.reverse()) {
            await page.keyboard.up(modifier)
          }
        } else {
          // Single key press
          const mappedKey = KEY_MAPPING[text] || text
          await page.keyboard.press(mappedKey)
        }
        return { success: true, message: 'Key pressed' }

      case 'left_click_drag':
        if (!coordinates) {
          throw createError({
            statusCode: 400,
            message: 'Coordinates required for drag action'
          })
        }
        await page.mouse.move(coordinates.x, coordinates.y)
        await page.mouse.down()
        await page.mouse.move(coordinates.x, coordinates.y)
        await page.mouse.up()
        return { success: true, message: 'Drag completed' }

      case 'right_click':
        await page.mouse.move(coordinates?.x || 0, coordinates?.y || 0)
        await page.mouse.click(coordinates?.x || 0, coordinates?.y || 0, {
          button: 'right'
        })
        return { success: true, message: 'Right click performed' }

      case 'middle_click':
        await page.mouse.move(coordinates?.x || 0, coordinates?.y || 0)
        await page.mouse.click(coordinates?.x || 0, coordinates?.y || 0, {
          button: 'middle'
        })
        return { success: true, message: 'Middle click performed' }

      case 'double_click':
        await page.mouse.move(coordinates?.x || 0, coordinates?.y || 0)
        await page.mouse.click(coordinates?.x || 0, coordinates?.y || 0, {
          clickCount: 2
        })
        return { success: true, message: 'Double click performed' }

      case 'success':
        await page.evaluate((message) => {
          const overlay = document.getElementById('step-overlay')
          if (!overlay) return
          
          // Create confetti
          const confettiContainer = document.createElement('div')
          confettiContainer.className = 'confetti'
          
          // Add multiple confetti pieces
          for (let i = 0; i < 50; i++) {
            const piece = document.createElement('div')
            piece.className = 'confetti-piece'
            piece.style.left = `${Math.random() * 100}%`
            piece.style.animationDelay = `${Math.random() * 2}s`
            confettiContainer.appendChild(piece)
          }
          
          overlay.innerHTML = `
            <div class="step-type">Success!</div>
            <div class="message">${message || '🎉 Operation completed successfully!'}</div>
          `
          overlay.appendChild(confettiContainer)
          overlay.classList.add('active', 'success-message')
          
          // Remove success styling after animation
          setTimeout(() => {
            overlay.classList.remove('success-message')
            setTimeout(() => {
              overlay.classList.remove('active')
            }, 3000)
          }, 1000)
        }, text) // Pass the text parameter as the message
        return { success: true, message: 'Success overlay displayed' }

      default:
        throw createError({
          statusCode: 400,
          message: 'Invalid action specified'
        })
    }

  } catch (error) {
    console.error('Computer control action failed:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to perform computer control action'
    })
  }
})