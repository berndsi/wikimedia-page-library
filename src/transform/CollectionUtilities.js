import Polyfill from './Polyfill'
import ElementUtilities from './ElementUtilities'
import NodeUtilities from './NodeUtilities'

const NodeTypes = NodeUtilities.NodeTypes

/**
 * Extracts array of page issues from element
 * @param {!Document} document
 * @param {?Element} element
 * @return {!Array.<string>} Return empty array if nothing is extracted
 */
const collectPageIssues = (document, element) => {
  if (!element) {
    return []
  }
  const tables =
    Polyfill.querySelectorAll(element, 'table.ambox:not(.ambox-multiple_issues):not(.ambox-notice)')
  // Get the tables into a fragment so we can remove some elements without triggering a layout
  const fragment = document.createDocumentFragment()
  const cloneTableIntoFragment =
    table => fragment.appendChild(table.cloneNode(true)) // eslint-disable-line require-jsdoc
  tables.forEach(cloneTableIntoFragment)
  // Remove some elements we don't want when "textContent" or "innerHTML" are used
  Polyfill.querySelectorAll(fragment, '.hide-when-compact, .collapsed').forEach(el => el.remove())
  return Polyfill.querySelectorAll(fragment, 'td[class*=mbox-text] > *[class*=mbox-text]')
}

/**
 * Extracts array of page issues HTML from element
 * @param {!Document} document
 * @param {?Element} element
 * @return {!Array.<string>} Return empty array if nothing is extracted
 */
const collectPageIssuesHTML = (document, element) =>
  collectPageIssues(document, element).map(el => el.innerHTML)

/**
 * Extracts array of page issues text from element
 * @param {!Document} document
 * @param {?Element} element
 * @return {!Array.<string>} Return empty array if nothing is extracted
 */
const collectPageIssuesText = (document, element) =>
  collectPageIssues(document, element).map(el => el.textContent.trim())

/**
 * Extracts array of disambiguation titles from an element
 * @param {?Element} element
 * @return {!Array.<string>} Return empty array if nothing is extracted
 */
const collectDisambiguationTitles = element => {
  if (!element) {
    return []
  }
  return Polyfill.querySelectorAll(element, 'div.hatnote a[href]:not([href=""]):not([redlink="1"])')
    .map(el => el.href)
}

/**
 * Extracts array of disambiguation items html from an element
 * @param {?Element} element
 * @return {!Array.<string>} Return empty array if nothing is extracted
 */
const collectDisambiguationHTML = element => {
  if (!element) {
    return []
  }
  return Polyfill.querySelectorAll(element, 'div.hatnote').map(el => el.innerHTML)
}




















const isCitation = href => href.indexOf('#cite_note') > -1
const isEndnote = href => href.indexOf('#endnote_') > -1
const isReference = href => href.indexOf('#ref_') > -1

const goDown = element => element.querySelector('A')

const REFERENCE_SELECTOR = '.reference'

/**
 * Skip over whitespace but not other elements
 */
const skipOverWhitespace = skipFunc => element => {
  let isElementWhitespaceTextNode
  do {
    element = skipFunc(element)
    isElementWhitespaceTextNode =
      !(!element || element.nodeType !== NodeTypes.TEXT_NODE || !element.textContent.match(/^\s+$/))
  } while (isElementWhitespaceTextNode)
  return element
}

let goLeft = skipOverWhitespace(element => element.previousSibling)
let goRight = skipOverWhitespace(element => element.nextSibling)

const hasCitationLink = element => {
  try {
    return isCitation(goDown(element).getAttribute('href'))
  } catch (e) {
    return false
  }
}

const getRefTextContainer = (document, sourceNode) => {
  if (sourceNode.tagName !== 'A') {
    sourceNode = goDown(sourceNode)
  }
  const refTextContainerID = sourceNode.getAttribute('href').slice(1)
  const refTextContainer =
    document.getElementById(refTextContainerID) || document.getElementById(decodeURIComponent(refTextContainerID))
  return refTextContainer
}

const collectRefText = (document, sourceNode) => {
  let refTextContainer = getRefTextContainer(document, sourceNode)
  if (!refTextContainer) {
    /* global console */
    console.log(`Reference target not found: ${targetId}`)
    return ''
  }
  
  // Clone what we're interested in into a frag so we can easily 
  // remove things without consequence to the 'live' document.
  const frag = document.createDocumentFragment()
  const fragDiv = document.createElement('div')
  frag.appendChild(fragDiv)
  
  const cloneNodeIntoFragmentDiv = node => fragDiv.appendChild(node.cloneNode(true))
  Array.prototype.slice.call(refTextContainer.childNodes)
    .filter(NodeUtilities.isNodeTypeElementOrText)
    .forEach(cloneNodeIntoFragmentDiv)
  
  const removalSelector = 'sup[id^=cite_ref], .mw-cite-backlink'
  Polyfill.querySelectorAll(fragDiv, removalSelector)
    .forEach(node => node.remove())
  
  return fragDiv.innerHTML
}

const collectRefLink = sourceNode => {
  if (Polyfill.matchesSelector(sourceNode, REFERENCE_SELECTOR)) {
    return sourceNode
  }
  return ElementUtilities.findClosestAncestor(sourceNode, REFERENCE_SELECTOR)
}

class ReferenceItem {
  constructor(id, rect, text, html) {
    this.id = id
    this.rect = rect
    this.text = text
    this.html = html
  }
}

const referenceItemForNode = (document, node) => {
  return new ReferenceItem(
    collectRefLink(node).id,
    node.getBoundingClientRect(),
    node.textContent,
    collectRefText(document, node)
  )
}

/**
 * Container for nearby references including the index of the selected reference.
 */
class NearbyReferences {
/**
 * @param  {!number} selectedIndex
 * @param  {!Array.<ReferenceItem>} referencesGroup
 * @return {void}
 */
  constructor(selectedIndex, referencesGroup) {
    this.selectedIndex = selectedIndex
    this.referencesGroup = referencesGroup
  }
}

const collectNearbyReferences = (document, sourceNode) => {
  const refNodes = collectNearbyReferenceNodes(sourceNode)
  return new NearbyReferences(
    refNodes.indexOf(sourceNode),
    refNodes.map(node => referenceItemForNode(document, node))
  )
}

const collectNearbyReferenceNodes = sourceNode => {
  let curNode = sourceNode

  // Start with clicked ref:
  const refNodes = [curNode]

  // Go left:
  curNode = sourceNode.parentElement
  while (hasCitationLink(goLeft(curNode))) {
    curNode = goLeft(curNode)
    refNodes.unshift(curNode)
  }

  // Go right:
  curNode = sourceNode.parentElement
  while (hasCitationLink(goRight(curNode))) {
    curNode = goRight(curNode)
    refNodes.push(curNode)    
  }

  return refNodes
}

export default {
  collectDisambiguationTitles,
  collectDisambiguationHTML,
  collectNearbyReferences,
  collectNearbyReferenceNodes,
  collectPageIssuesHTML,
  collectPageIssuesText,
  isCitation,
  isEndnote,
  isReference,
  test: {
    collectPageIssues
  }
}