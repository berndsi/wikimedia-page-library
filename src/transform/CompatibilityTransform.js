const COMPATIBILITY = {
  FILTER: 'pagelib-compatibility-filter'
}

/**
 * @param {!Document} document
 * @param {!string[]} properties
 * @param {!string} value
 * @return {void}
 */
const isStyleSupported = (document, properties, value) => {
  const element = document.createElement('span')
  return properties.some(property => {
    element.style[property] = value
    return element.style.cssText
  })
}

/**
 * @param {!Document} document
 * @return {void}
 */
const isFilterSupported = document =>
  isStyleSupported(document, ['webkitFilter', 'filter'], 'blur(0)')

/**
 * @param {!Document} document
 * @return {void}
 */
const enableSupport = document => {
  const html = document.querySelector('html')
  if (!isFilterSupported(document)) { html.classList.add(COMPATIBILITY.FILTER) }
}

export default {
  COMPATIBILITY,
  enableSupport
}