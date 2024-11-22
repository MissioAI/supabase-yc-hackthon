import puppeteer, { Browser, Page } from 'puppeteer'

// Store browser and page instances
let browser: Browser | null = null
let page: Page | null = null

// Initialize browser and page if not already done
async function initBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: false
    })
  }
  if (!page) {
    page = await browser.newPage()
    await page.setViewport({
      width: 1280,
      height: 800
    })
    // Navigate to Google by default
    await page.goto('https://www.google.com', { waitUntil: 'networkidle0' })
  }
  return { browser, page }
}

// Add this key mapping at the top of the file
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
  const { action, url, coordinates, text } = body

  if (!action) {
    throw createError({
      statusCode: 400,
      message: 'Action parameter is required'
    })
  }

  try {
    const { page } = await initBrowser()

    switch (action) {
      case 'screenshot':
        // Only navigate if URL is provided
        if (url) {
          await page.goto(url, { waitUntil: 'networkidle0' })
        }
        const screenshot = await page.screenshot({ 
          type: 'png', 
          fullPage: true,
          encoding: 'base64'
        })
        return {
          type: 'image',
          data: screenshot
        }

      case 'click':
        if (!coordinates) {
          throw createError({
            statusCode: 400,
            message: 'Coordinates are required for click action'
          })
        }
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
        // Close the browser if needed
        if (browser) {
          await browser.close()
          browser = null
          page = null
        }
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
        await page.mouse.down()
        await page.mouse.move(coordinates.x, coordinates.y)
        await page.mouse.up()
        return { success: true, message: 'Drag completed' }

      case 'right_click':
        await page.mouse.click(coordinates?.x || 0, coordinates?.y || 0, {
          button: 'right'
        })
        return { success: true, message: 'Right click performed' }

      case 'middle_click':
        await page.mouse.click(coordinates?.x || 0, coordinates?.y || 0, {
          button: 'middle'
        })
        return { success: true, message: 'Middle click performed' }

      case 'double_click':
        await page.mouse.click(coordinates?.x || 0, coordinates?.y || 0, {
          clickCount: 2
        })
        return { success: true, message: 'Double click performed' }

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