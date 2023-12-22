/*! Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk')
const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const chromium = require('@sparticuz/chromium');

const pageURL = process.env.TARGET_URL
const agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36'

exports.handler = async (event, context) => {

  console.log('event:', event);

  let result = null;
  let browser = null;

  try {
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    let page = await browser.newPage();
    await page.setUserAgent(agent)

    console.log('loading:', pageURL)

    await page.goto(pageURL, { waitUntil: 'networkidle0' })
    const buffer = await page.screenshot()
    const html = await page.content()

    result = await page.title()

    const s3Key = uuidv4()
    console.log('key:', s3Key)

    const s3ImageResult = await s3
      .upload({
        Bucket: process.env.S3_BUCKET,
        Key: `${s3Key}.png`,
        Body: buffer,
        ContentType: 'image/png',
        ACL: 'public-read'
      })
      .promise()
      
    console.log('imageUrl:', s3ImageResult.Location)

    const s3HtmlResult = await s3
      .upload({
        Bucket: process.env.S3_BUCKET,
        Key: `${s3Key}.html`,
        Body: html,
        ContentType: 'text/html',
        ACL: 'public-read'
      })
      .promise()

    console.log('htmlUrl:', s3HtmlResult.Location)
    
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