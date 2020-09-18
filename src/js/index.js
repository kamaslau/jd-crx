console.log('index.js loaded')

const app = new Vue({
  el: '#app',

  data: {
    current_year: new Date().getFullYear(),

    current_tab: undefined, // 当前页面（即浏览器标签页）信息

    // 初始数据
    init_item: {
      figure_images: '', // 商品图片；仅作前端业务数据用途，请求API时为节省带宽可清除掉

      barcode: '', // 条形码/ISBN
      name: '', // 标题
      tag_price: 0.00, // 标签价/原价
      image_main_url: '', // 主图URL
      image_figure_urls: '', // 形象图URL
      unit_name: '本', // 销售单位
      unit_copy: 1, // 单位件数
      weight_net: 0.5, // 净重
      weigth_gross: 0.5, // 毛重
      weigth_volumn: 0, // 体积重
      slogan: '', // 宣传语
      description: '', // 描述
      type: 'PRODUCT', // 商品类型；实体

      // 非通用字段
      author: '', // 作者
      publisher: '', // 出版社
      time_publish: '', // 出版时间
      format: 32, // 开本
      jd_url: '', // 京东详情页,
      jd_id: '', // 京东ID,
    },

    item: {},

    message: '',
    message_class: 'alert'
  },

  computed: {
    images() {
      return this.item.figure_images ? this.item.figure_images.trim().split(',') : []
    }
  },

  watch: {
    images(value) {
      const current_images = [...value]
      this.item.image_main_url = current_images.shift()
      this.item.image_figure_urls = current_images
      // console.log('watch:images:', this.item)
    }
  },

  mounted() {
    this.item = {
      ...this.init_item
    }

    this.restoreHistory()

    this.getCurrentTab()
  },

  methods: {
    // 尝试获取并恢复历史数据到状态
    restoreHistory() {
      // 调用异步storageAPI
      chrome.storage.sync.get(
        [...Object.keys(this.init_item)],
        storage => {
          // console.log('restoreHistory: ', storage)

          if (Object.keys(storage).length > 0 && storage.name.length > 0) {
            Object.assign(this.item, storage)
          } else {
            document.querySelector('[name=barcode]').focus() // 若无本地值，聚焦到条形码字段
          }
        }
      )
    },

    // 获取当前页面信息（即浏览器标签页）
    // https://developer.chrome.com/extensions/tabs#method-query
    getCurrentTab() {
      chrome.tabs.query({
        currentWindow: true,
        active: true
      }, tabs => {
        // console.log('tabs: ', tabs)

        this.current_tab = tabs.shift()
        // console.log('this.current_tab: ', this.current_tab)
      })
    },

    // 解析DOM-获取详情
    dom_get_brief() {
      this.updateScreen('数据解析中', 'light')

      this.resetAll() // 重置数据

      chrome.tabs.sendMessage(
        this.current_tab.id, {
          action: "getBrief"
        },
        response => {
          // console.log(response)
          this.updateScreen('已完成解析', 'success')

          Object.assign(this.item, response)

          // 调用异步storageAPI
          chrome.storage.sync.set(this.item, () => {
            // console.log('store saved to storage.sync as: ', this.item)
          })
        }
      )
    },

    // 根据条形码检查是否对应的商品已存在
    getItem(barcode) {
      console.log('getItem.barcode: ', barcode)
      if (barcode && barcode.length !== 13) return

      // 发送到插件后台（js/background.js）进行API请求
      chrome.runtime.sendMessage({
          action: 'getItem',
          params: {
            barcode
          }
        },
        response => {
          console.log('response to getItem: ', response)
          const content = response.content

          let message = '与该条形码对应的数据',
            style_class

          if (response.status === 200) {
            Object.assign(this.item, content)

            // 调用异步storageAPI
            chrome.storage.sync.set(this.item, () => {
              // console.log('store saved to storage.sync as: ', this.item)
            })

            message += '已存在'
            style_class = 'primary'

          } else {
            message += '暂无记录'
            style_class = 'light'

            this.dom_get_brief() // 解析DOM
          }

          // 更新反馈
          this.updateScreen(message, style_class)
        }
      )
    },

    // 获取商品条形码
    getBarcode() {
      this.resetAll()

      chrome.tabs.sendMessage(
        this.current_tab.id, {
          action: 'getBarcode'
        },
        response => {
          // console.log(response)
          this.item.barcode = response
        }
      )
    },

    // 获取商品条形码，并尝试请求API获取已有的数据（若有）
    tryBarcode() {
      this.resetAll()

      chrome.tabs.sendMessage(
        this.current_tab.id, {
          action: 'getBarcode'
        },
        response => {
          // console.log(response)
          this.item.barcode = response

          this.updateScreen('远程数据获取中', 'light')
          this.getItem(this.item.barcode)
        }
      )
    },

    /**
     * 保存数据
     * 
     * 发送数据到API
     */
    saveData() {
      // console.table('saveData: ', this.item)

      if (
        !this.item.barcode || this.item.barcode.length !== 13 ||
        !this.item.name ||
        !this.item.tag_price || Number(this.item.tag_price) < 0.01 ||
        !this.item.time_publish || this.item.time_publish.length < 4
      ) {
        // 更新反馈
        console.log(this.item)
        this.updateScreen('需正确填写所有字段', 'danger')
        return
      }

      chrome.runtime.sendMessage({
          action: 'saveData',
          params: {
            ...this.item
          }
        },
        response => {
          console.log('response to saveData: ', response)
          const content = response.content

          let message, style_class

          if (response.status === 200) {
            message = content.message
            style_class = 'success'
          } else {
            message = content.error.message
            style_class = 'danger'
          }

          this.updateScreen(message, style_class)

          this.resetAll()
        }
      )
    },

    // 全局重置；重置按钮表单、异步存储，及状态
    resetAll() {
      this.item = {
        ...this.init_item
      }

      // 调用异步storageAPI
      chrome.storage.sync.set(this.item, () => {
        // console.log('store saved to storage.sync as: ', this.item)
      })
    },

    // 更新操作反馈区
    updateScreen(text, style_class) {
      this.message = text
      this.message_class = 'alert alert-' + style_class

      // 隐藏提示
      const fadeProcess = setTimeout(
        () => {
          this.message = ''
          this.message_class = 'alert'
        },
        2500
      )
    },

    /**
     * 调整当前项目
     * 
     * @param int index 当前项索引
     * @param int offset offset偏移量（ 正数向后移， 负数向前移， 0 删除）
     */
    move_item(index, offset = 0) {
      // 删除项之前需弹框确认
      // if (offset === 0 && !confirm('确定删除此项？')) return

      const item = this.images[index] // 待调整项
      const new_index = index + offset // 目标位置
      // console.log('move ', item, ' to ', new_index)

      // 从当前位置移除
      // console.log('items before: ', this.images)
      let items = this.images
      items.splice(index, 1)

      // 若非删除，则插入待调整项到目标位置
      if (offset !== 0) items.splice(new_index, 0, item)

      this.item.figure_images = items.join(',') // 完成调整
      // console.log('items after: ', this.images)
    },

    /**
     * 保留特定数量的项目
     * 
     * @param int index 截止项目的索引值
     */
    keep_until(index = 0) {
      console.log('keep_until: ', index)
      this.item.figure_images = this.images.slice(0, index + 1).join(',')
    }
  }

})

// end index.js