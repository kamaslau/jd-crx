console.log('background.js loaded')

// 监听插件加载
// https://developer.chrome.com/extensions/background_pages#initialization
chrome.runtime.onInstalled.addListener(() => {
  console.log('chrome.runtime.onInstalled')

  // 在京东的详情页面激活插件窗口
  // 为防止干扰，先清除已有规则
  // https: //developer.chrome.com/extensions/declarativeContent
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([{
      // 当URL中含有特定字符串时，使插件窗口可用
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: {
            hostEquals: 'item.jd.com'
          },
        })
      ],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
})

// 监听插件挂起
chrome.runtime.onSuspend.addListener(() => {
  console.log('chrome.runtime.onSuspend')
})

// 响应内部通信，请求API
chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    console.log('chrome.runtime.onMessage: ')
    console.log('request.params: ', request.params)

    // 获取数据
    if (request.action === 'getItem') {
      (async () => {
        const data = await api_request('item_template/detail', request.params)

        console.log('getItem data: ', data)
        sendResponse(data)
      })()

      return true

    } else if (request.action === 'saveData') { // 保存数据
      (async () => {
        const data = await api_request('item_template/create', request.params)

        console.log('saveData data: ', data)
        sendResponse(data)
      })()

      return true
    }
  }
)

// API公共参数
const api_root = 'https://api.imakp.liuyajie.com/'
const common_params = {
  'app_type': 'biz',
  'operator_id': 1
}
// API请求参数
let params = {}

// 请求方法
const api_request = async (api_url, inputs) => {
  // 请求API
  params = {
    ...common_params,
    ...inputs
  }

  // 将参数转为FormData进行发送
  const form_data = new FormData()
  Object.keys(params).forEach(
    key => {
      form_data.append(key, params[key])
      // console.log(form_data.get(key)) // FormData对象无法直接console.log，可通过get方法查看特定键值
    }
  )

  let api_result = ''

  await new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()

    request.open('post', api_root + api_url, true)

    request.onload = () => {

      if (request.status === 200) {
        api_result = JSON.parse(request.response)
        // console.log(api_result)

        resolve(api_result)
      } else {
        reject(Error(request.statusText))
      }
    }

    request.onerror = () => {
      reject(Error('Network Error'))
    }

    request.send(form_data)
  })

  return api_result // end Promise
} // end function api_request

// end background.js