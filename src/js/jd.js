console.log('jd.js loaded')

window.onload = () => {
  const hint = document.createElement('p')
  hint.id = 'crx_status'
  hint.innerText = '【“京东分析师”插件运行中】'
  document.querySelector('#name').before(hint)
}

// 条形码
const getBarcode = () => {
  let value
  const source = document.querySelectorAll('#parameter2 li')

  // 轮询列表项DOM列表，查找首个格式为13位数字的数据项
  source.forEach(item => {
    const isbn_match = item.title.match(/\d{13}/)
    if (isbn_match) value = isbn_match.shift()
  })

  return value
}

// 开本
const getFormat = () => {
  let value = 32 // 默认32开
  const source = document.querySelectorAll('#parameter2 li')

  // 查找含有“开本：”字符串的DOM并取出所需值
  for (let i = 0; i < source.length; i++) {
    let target_index = source[i].innerText.indexOf('开本：')
    if (target_index > -1) {
      value = source[i].innerText.replace(/[^0-9.]*/g, '') // 仅保留数字和小数点

      break
    }
  }

  return value
}

// 标题
const getName = () => document.querySelector('#name .sku-name').innerText.trim()

// 标价
const getTagPrice = () => {
  const source = document.querySelector('#page_maprice').innerText.trim()
  return source.replace(/[^0-9.]*/g, '') // 仅保留数字和小数点
}

// 图片
const getImages = () => {
  let value
  const source = document.querySelectorAll('#spec-list img')
  let result = []

  source.forEach(item => {
    // 将图片规格由京东默认的预览级别n5调整为属性中相应的大规格图片级别
    let big_image = item.src.replace(/n5/, 'n' + item.dataset.img)
    result.push(big_image)
  })
  value = [...new Set(result)].sort().join(',') // 去掉重复项（借助ES6的Set数据结构）

  return value
}

// 作者
const getAuthor = () => {
  let value = []
  const source = document.querySelectorAll('#p-author [data-name]')
  source.forEach(item => value.push(item.dataset.name))

  return value.join(',')
}

// 出版社
const getPublisher = () => {
  let value = ''
  const source = document.querySelectorAll('#parameter2 li')

  // 查找含有“出版社：”字符串的DOM并取出所需值
  for (let i = 0; i < source.length; i++) {
    let target_index = source[i].innerText.indexOf('出版社：')
    if (target_index > -1) {
      // 取出冒号之后的文本
      value = source[i].innerText.split('：').pop().trim()
      break
    }
  }

  return value
}

// 出版时间
const getPublishTime = () => {
  let value = ''
  const source = document.querySelectorAll('#parameter2 li')

  // 查找含有“出版时间：”字符串的DOM并取出所需值
  for (let i = 0; i < source.length; i++) {
    let target_index = source[i].innerText.indexOf('出版时间：')
    if (target_index > -1) {
      // 取出冒号之后的文本
      value = source[i].innerText.split('：').pop().trim()
      break
    }
  }

  return value
}

// 重量
const getWeight = () => {
  let value = ''
  const source = document.querySelector('#summary-weight')

  value = source.innerText.replace(/[^0-9.]*/g, '') // 仅保留数字和小数点

  return value
}

// 获取当前页面URL
const getUrl = () => location.protocol + '//' + location.host + location.pathname

// 从页面URL中获取京东商品ID
const getId = () => location.pathname.match(/\d+/g).shift()

/**
 * 响应通信的主方法
 */
chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    // 获取摘要信息
    if (request.action === 'getBrief') {
      const value = {
        barcode: getBarcode(),
        name: getName(),
        tag_price: getTagPrice(),
        figure_images: getImages(),
        publisher: getPublisher(),
        author: getAuthor(),
        time_publish: getPublishTime(),
        format: getFormat(),
        weight_net: getWeight(),
        weight_gross: getWeight(),
        jd_id: getId(),
        jd_url: getUrl(),
      }

      if (Object.keys(value).length > 0) {
        sendResponse(value)
      } else {
        sendResponse(null)
      }
    }

    // 获取商品条形码/ISBN
    else if (request.action === 'getBarcode') {
      const value = getBarcode()

      if (value.length > 0) {
        sendResponse(value)
      } else {
        sendResponse(null)
      }
    }
  }
)

// end jd.js