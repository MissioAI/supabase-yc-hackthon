import puppeteer from 'puppeteer'

export default defineEventHandler(async (event) => {
  // Get URL from query params
  const query = getQuery(event)
  const url = query.url as string

  if (!url) {
    throw createError({
      statusCode: 400,
      message: 'URL parameter is required'
    })
  }

  const browser = await puppeteer.launch({
    headless: false
  })

  try {
    const page = await browser.newPage()
    
    // Set viewport size
    await page.setViewport({
      width: 1280,
      height: 800
    })

    // Navigate to URL
    await page.goto(url, {
      waitUntil: 'networkidle0'
    })

    // Take screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false
    })

    // Set response headers
    setHeaders(event, {
      'Content-Type': 'image/png',
      'Content-Disposition': 'attachment; filename="screenshot.png"'
    })

    return screenshot

  } catch (error) {
    console.error('Screenshot failed:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to capture screenshot'
    })
  } finally {
    await browser.close()
  }
})