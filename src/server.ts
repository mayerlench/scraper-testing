import * as puppeteer from 'puppeteer'
import * as R from 'ramda'
import * as fs from 'fs'

(async () => {
  const browser = await puppeteer.launch({ headless: false, devtools: true })
  const page = await browser.newPage()
  await page.goto('https://match.angieslist.com/category/startRequest.html')
  await page.waitForSelector('li.threecol')
  await page.addScriptTag({
    type: 'text/javascript',
    url: 'https://cdnjs.cloudflare.com/ajax/libs/ramda/0.26.1/ramda.min.js'
  })

  page.on('console', function (consoleMessageObject) {
    if (consoleMessageObject.type() !== 'warning') {
      console.debug(consoleMessageObject.text())
    }
  })

  var categories = await page.evaluate(() => {
    var titleNodeList = document.querySelectorAll('li.threecol')

    return R.range(0, titleNodeList.length).map(i => {
      return {
        link: titleNodeList[i].getElementsByTagName('a')[0].href,
        name: titleNodeList[i].getElementsByClassName('category-name')[0].children[0].innerHTML
      }
    })
  })
  await browser.close()


  const promiseSerial = funcs =>
    funcs.reduce((promise, func) =>
      promise.then(result =>
        func().then(Array.prototype.concat.bind(result))),
      Promise.resolve([])
    )

  const funcs = categories.map((category, index) => async () => {
    const browser = await puppeteer.launch({ headless: false, devtools: true })
    const page = await browser.newPage()
    await page.goto(category.link)
    await page.addScriptTag({
      type: 'text/javascript',
      url: 'https://cdnjs.cloudflare.com/ajax/libs/ramda/0.26.1/ramda.min.js'
    })


    var subCategories = await page.evaluate(() => {
      var titleNodeList = document.querySelectorAll('a.panel-list-item')
      if (!titleNodeList) return ''

      return R.range(0, titleNodeList.length).map(i => {
        return titleNodeList[i].textContent
      })
    })
    await browser.close()
    return { category: category.name, subCategories }

  })

  const results = await promiseSerial(funcs)
  fs.writeFileSync('./services.json', JSON.stringify(results))
})()