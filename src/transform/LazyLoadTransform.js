import './LazyLoadTransform.css'
import ElementGeometry from './ElementGeometry'
import ElementUtilities from './ElementUtilities'
import Polyfill from './Polyfill'

// CSS classes used to identify and present lazily loaded images. Placeholders are members of
// PLACEHOLDER_CLASS and one state class: pending, loading, or error. Images are members of either
// loading or loaded state classes. Class names should match those in LazyLoadTransform.css.
const PLACEHOLDER_CLASS = 'pagelib_lazy_load_placeholder'
const PLACEHOLDER_PENDING_CLASS = 'pagelib_lazy_load_placeholder_pending' // Download pending.
const PLACEHOLDER_LOADING_CLASS = 'pagelib_lazy_load_placeholder_loading' // Download started.
const PLACEHOLDER_ERROR_CLASS = 'pagelib_lazy_load_placeholder_error' // Download failure.
const IMAGE_LOADING_CLASS = 'pagelib_lazy_load_image_loading' // Download started.
const IMAGE_LOADED_CLASS = 'pagelib_lazy_load_image_loaded' // Download completed.

// Attributes copied from images to placeholders via data-* attributes for later restoration. The
// image's classes and dimensions are also set on the placeholder.
// The 3 data-* items are used by iOS.
const COPY_ATTRIBUTES = ['class', 'style', 'src', 'srcset', 'width', 'height', 'alt',
  'data-file-width', 'data-file-height', 'data-image-gallery'
]

// Small images, especially icons, are quickly downloaded and may appear in many places. Lazily
// loading these images degrades the experience with little gain. Always eagerly load these images.
// Example: flags in the medal count for the "1896 Summer Olympics medal table."
// https://en.m.wikipedia.org/wiki/1896_Summer_Olympics_medal_table?oldid=773498394#Medal_count
const UNIT_TO_MINIMUM_LAZY_LOAD_SIZE = {
  px: 50, // https://phabricator.wikimedia.org/diffusion/EMFR/browse/master/includes/MobileFormatter.php;c89f371ea9e789d7e1a827ddfec7c8028a549c12$22
  ex: 10, // ''
  em: 5 // 1ex ≈ .5em; https://developer.mozilla.org/en-US/docs/Web/CSS/length#Units
}

/**
 * Replace an image with a placeholder.
 * @param {!Document} document
 * @param {!HTMLImageElement} image The image to be replaced.
 * @return {!HTMLSpanElement} The placeholder replacing image.
 */
const convertImageToPlaceholder = (document, image) => {
  // There are a number of possible implementations for placeholders including:
  //
  // - [MobileFrontend] Replace the original image with a span and replace the span with a new
  //   downloaded image.
  //   This option has a good fade-in but has some CSS concerns for the placeholder, particularly
  //   `max-width`, and causes significant reflows when used with image widening.
  //
  // - [Previous] Replace the original image with a span and append a new downloaded image to the
  //   span.
  //   This option has the best cross-fading and extensibility but makes duplicating all the CSS
  //   rules for the appended image impractical.
  //
  // - [Previous] Replace the original image's source with a transparent image and update the source
  //   from a new downloaded image.
  //   This option has a good fade-in and minimal CSS concerns for the placeholder and image but
  //   causes significant reflows when used with image widening.
  //
  // - [Current] Replace the original image with a couple spans and replace the spans with a new
  //   downloaded image.
  //   This option is about the same as MobileFrontend but supports image widening without reflows.

  // Create the root placeholder.
  const placeholder = document.createElement('span')

  // Copy the image's classes and append the placeholder and current state (pending) classes.
  if (image.hasAttribute('class')) {
    placeholder.setAttribute('class', image.getAttribute('class'))
  }
  placeholder.classList.add(PLACEHOLDER_CLASS)
  placeholder.classList.add(PLACEHOLDER_PENDING_CLASS)

  // Match the image's width, if specified. If image widening is used, this width will be overridden
  // by !important priority.
  const geometry = ElementGeometry.from(image)
  if (geometry.width) { placeholder.style.setProperty('width', `${geometry.width}`) }

  // Save the image's attributes to data-* attributes for later restoration.
  ElementUtilities.copyAttributesToDataAttributes(image, placeholder, COPY_ATTRIBUTES)

  // Create a spacer and match the aspect ratio of the original image, if determinable. If image
  // widening is used, this spacer will scale with the width proportionally.
  const spacing = document.createElement('span')
  if (geometry.width && geometry.height) {
    // Assume units are identical.
    const ratio = geometry.heightValue / geometry.widthValue
    spacing.style.setProperty('padding-top', `${ratio * 100}%`)
  }

  // Append the spacer to the placeholder and replace the image with the placeholder.
  placeholder.appendChild(spacing)
  image.parentNode.replaceChild(placeholder, image)

  return placeholder
}

/**
 * @param {!HTMLImageElement} image The image to be considered.
 * @return {!boolean} true if image download can be deferred, false if image should be eagerly
 *                    loaded.
 */
const isLazyLoadable = image => {
  const geometry = ElementGeometry.from(image)
  if (!geometry.width || !geometry.height) { return true }
  return geometry.widthValue >= UNIT_TO_MINIMUM_LAZY_LOAD_SIZE[geometry.widthUnit]
    && geometry.heightValue >= UNIT_TO_MINIMUM_LAZY_LOAD_SIZE[geometry.heightUnit]
}

/**
 * @param {!Element} element
 * @return {!Array.<HTMLImageElement>} Convertible images descendent from but not including element.
 */
const queryLazyLoadableImages = element =>
  Polyfill.querySelectorAll(element, 'img').filter(image => isLazyLoadable(image))

/**
 * Convert images with placeholders. The transformation is inverted by calling loadImage().
 * @param {!Document} document
 * @param {!Array.<HTMLImageElement>} images The images to lazily load.
 * @return {!Array.<HTMLSpanElement>} The placeholders replacing images.
 */
const convertImagesToPlaceholders = (document, images) =>
  images.map(image => convertImageToPlaceholder(document, image))

/**
 * Start downloading image resources associated with a given placeholder and replace the placeholder
 * with a new image element when the download is complete.
 * @param {!Document} document
 * @param {!HTMLSpanElement} placeholder
 * @return {!HTMLImageElement} A new image element.
 */
const loadPlaceholder = (document, placeholder) => {
  placeholder.classList.add(PLACEHOLDER_LOADING_CLASS)
  placeholder.classList.remove(PLACEHOLDER_PENDING_CLASS)

  const image = document.createElement('img')

  const retryListener = event => { // eslint-disable-line require-jsdoc
    image.setAttribute('src', image.getAttribute('src'))
    event.stopPropagation()
    event.preventDefault()
  }

  // Add the download listener prior to setting the src attribute to avoid missing the load event.
  image.addEventListener('load', () => {
    placeholder.removeEventListener('click', retryListener)
    placeholder.parentNode.replaceChild(image, placeholder)
    image.classList.add(IMAGE_LOADED_CLASS)
    image.classList.remove(IMAGE_LOADING_CLASS)
  }, { once: true })

  image.addEventListener('error', () => {
    placeholder.classList.add(PLACEHOLDER_ERROR_CLASS)
    placeholder.classList.remove(PLACEHOLDER_LOADING_CLASS)
    placeholder.addEventListener('click', retryListener)
  }, { once: true })

  // Set src and other attributes, triggering a download.
  ElementUtilities.copyDataAttributesToAttributes(placeholder, image, COPY_ATTRIBUTES)

  // Append to the class list after copying over any preexisting classes.
  image.classList.add(IMAGE_LOADING_CLASS)

  return image
}

export default {
  queryLazyLoadableImages,
  convertImagesToPlaceholders,
  loadPlaceholder
}