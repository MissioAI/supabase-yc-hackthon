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