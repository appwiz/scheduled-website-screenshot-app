const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk')
const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const puppeteer = require("puppeteer-core");
const chromium = require('@sparticuz/chromium');

const pageURL = process.env.TARGET_URL
const agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36'

exports.handler = async (event, context) => {

  console.log('event:', event);

  let result = null;
  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    let page = await browser.newPage();
    await page.setUserAgent(agent)

    console.log('loading:', pageURL)

    await page.goto(pageURL, { waitUntil: 'networkidle0' })
    const buffer = await page.screenshot()
    const html = await page.content()
    const pdf = await page.pdf({ displayHeaderFooter: true, printBackground: true })

    result = await page.title()

    const s3Key = uuidv4()
    console.log('key:', s3Key)

    const s3ImageResult = await s3
      .upload({
        Bucket: process.env.S3_BUCKET,
        Key: `${s3Key}.png`,
        Body: buffer,
        ContentType: 'image/png'
      })
      .promise()
      
    console.log('imageUrl:', s3ImageResult.Location)

    const s3HtmlResult = await s3
      .upload({
        Bucket: process.env.S3_BUCKET,
        Key: `${s3Key}.html`,
        Body: html,
        ContentType: 'text/html'
      })
      .promise()

    console.log('htmlUrl:', s3HtmlResult.Location)

    const s3PdfResult = await s3
      .upload({
        Bucket: process.env.S3_BUCKET,
        Key: `${s3Key}.pdf`,
        Body: pdf,
        ContentType: 'application/pdf'
      })
      .promise()
    
    console.log('pdfUrl:', s3PdfResult.Location)
    
    await page.close();
    await browser.close();
    
  } catch (error) {
    console.log(error)
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }

  return result
}