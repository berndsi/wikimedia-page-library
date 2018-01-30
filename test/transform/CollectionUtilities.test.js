import assert from 'assert'
import domino from 'domino'
import fixtureIO from '../utilities/FixtureIO'
import pagelib from '../../build/wikimedia-page-library-transform'

let document

const CollectionUtilities = pagelib.CollectionUtilities

describe('CollectionUtilities', () => {
  beforeEach(() => {
    document = fixtureIO.documentFromFixtureFile('CollectionUtilities.html')
  })

  describe('.collectPageIssuesText()', () => {
    it('find text issues', () => {
      const element = document.querySelector('div#content_block_0')
      assert.deepEqual(CollectionUtilities.collectPageIssuesText(document, element), [
        'This article includes a list of references, but its sources remain unclear because it has insufficient inline citations.  (January 2016)', // eslint-disable-line max-len
        'This article may be confusing or unclear to readers.  (October 2016)',
        'This article may be too long to read and navigate comfortably.  (October 2016)'
      ])
    })
    it('empty array returned when no titles exists', () => {
      document = domino.createDocument(
        '<div id=content_block_0>No disambiguation titles here!</div>'
      )
      const element = document.querySelector('div#content_block_0')
      assert.deepEqual(CollectionUtilities.collectPageIssuesText(document, element), [])
    })
    it('empty array returned when no titles found because element does not exist', () => {
      const element = document.querySelector('div#content_block_1')
      assert.deepEqual(CollectionUtilities.collectPageIssuesText(document, element), [])
    })
  })
  describe('.collectPageIssuesHTML()', () => {
    it('find html issues', () => {
      const element = document.querySelector('div#content_block_0')
      assert.deepEqual(CollectionUtilities.collectPageIssuesHTML(document, element), [
        'This article includes a <a href="/wiki/Wikipedia:Citing_sources" title="Wikipedia:Citing sources">list of references</a>, but <b>its sources remain unclear</b> because it has <b>insufficient <a href="/wiki/Wikipedia:Citing_sources#Inline_citations" title="Wikipedia:Citing sources">inline citations</a></b>.  <small><i>(January 2016)</i></small> ', // eslint-disable-line max-len
        'This article <b>may be <a href="/wiki/Wikipedia:Vagueness" title="Wikipedia:Vagueness">confusing or unclear</a> to readers</b>.  <small><i>(October 2016)</i></small> ', // eslint-disable-line max-len
        'This article <b>may be <a href="/wiki/Wikipedia:Article_size" title="Wikipedia:Article size">too long</a> to read and navigate comfortably</b>.  <small><i>(October 2016)</i></small>' // eslint-disable-line max-len
      ])
    })
    it('empty array returned when no titles exists', () => {
      document = domino.createDocument(
        '<div id=content_block_0>No disambiguation titles here!</div>'
      )
      const element = document.querySelector('div#content_block_0')
      assert.deepEqual(CollectionUtilities.collectPageIssuesHTML(document, element), [])
    })
    it('empty array returned when no titles found because element does not exist', () => {
      const element = document.querySelector('div#content_block_1')
      assert.deepEqual(CollectionUtilities.collectPageIssuesHTML(document, element), [])
    })
  })
  describe('.collectDisambiguationTitles()', () => {
    it('find disambiguation titles', () => {
      const element = document.querySelector('div#content_block_0')
      assert.deepEqual(CollectionUtilities.collectDisambiguationTitles(element), [
        '/wiki/Westerners_(Korean_political_faction)',
        '/wiki/Occident_(disambiguation)',
        '/wiki/Western_Hemisphere',
        '/wiki/Western_bloc',
        '/wiki/Western_culture',
        '/wiki/Westernization'
      ])
    })
    it('empty array returned when no titles exists', () => {
      document = domino.createDocument(
        '<div id=content_block_0>No disambiguation titles here!</div>'
      )
      const element = document.querySelector('div#content_block_0')
      assert.deepEqual(CollectionUtilities.collectDisambiguationTitles(element), [])
    })
    it('empty array returned when no titles found because element does not exist', () => {
      const element = document.querySelector('div#content_block_1')
      assert.deepEqual(CollectionUtilities.collectDisambiguationTitles(element), [])
    })
    it('redlink titles ignored', () => {
      document = domino.createDocument(`
        <div id=content_block_0>
          <div role="note" class="hatnote navigation-not-searchable">
            This article includes a <a href="/wiki/SampleRedlink" redlink=1>sample redlink</a> and
            one <a href="/wiki/NonRedlink">non-redlink</a>.
          </div>
        </div>
      `)
      const element = document.querySelector('div#content_block_0')
      assert.deepEqual(CollectionUtilities.collectDisambiguationTitles(element), [
        '/wiki/NonRedlink'
      ])
    })
    it('empty href titles ignored', () => {
      document = domino.createDocument(`
        <div id=content_block_0>
          <div role="note" class="hatnote navigation-not-searchable">
            This article includes a <a href="">sample empty href</a> and
            one <a href="/wiki/NonEmptyHref">non-empty href</a>.
          </div>
        </div>
      `)
      const element = document.querySelector('div#content_block_0')
      assert.deepEqual(CollectionUtilities.collectDisambiguationTitles(element), [
        '/wiki/NonEmptyHref'
      ])
    })
    it('missing href titles ignored', () => {
      document = domino.createDocument(`
        <div id=content_block_0>
          <div role="note" class="hatnote navigation-not-searchable">
            This article includes a <a>sample missing href</a> and
            one <a href="/wiki/NonMissingHref">non-missing href</a>.
          </div>
        </div>
      `)
      const element = document.querySelector('div#content_block_0')
      assert.deepEqual(CollectionUtilities.collectDisambiguationTitles(element), [
        '/wiki/NonMissingHref'
      ])
    })
  })
  describe('.collectDisambiguationHTML()', () => {
    it('find disambiguation titles', () => {
      const element = document.querySelector('div#content_block_0')
      assert.deepEqual(CollectionUtilities.collectDisambiguationHTML(element), [
        '"Westerners" and "Occident" redirect here. For historical politics in Korea, see <a href="/wiki/Westerners_(Korean_political_faction)" title="Westerners (Korean political faction)">Westerners (Korean political faction)</a>. For other uses, see <a href="/wiki/Occident_(disambiguation)" class="mw-disambig" title="Occident (disambiguation)">Occident (disambiguation)</a>.', // eslint-disable-line max-len
        'Not to be confused with <a href="/wiki/Western_Hemisphere" title="Western Hemisphere">Western Hemisphere</a> or <a href="/wiki/Western_bloc" class="mw-redirect" title="Western bloc">Western bloc</a>.', // eslint-disable-line max-len
        'See also: <a href="/wiki/Western_culture" title="Western culture">Western culture</a> and <a href="/wiki/Westernization" title="Westernization">Westernization</a>' // eslint-disable-line max-len
      ])
    })
    it('empty array returned when no titles exists', () => {
      document = domino.createDocument(
        '<div id=content_block_0>No disambiguation titles here!</div>'
      )
      const element = document.querySelector('div#content_block_0')
      assert.deepEqual(CollectionUtilities.collectDisambiguationHTML(element), [])
    })
    it('empty array returned when no titles found because element does not exist', () => {
      const element = document.querySelector('div#content_block_1')
      assert.deepEqual(CollectionUtilities.collectDisambiguationHTML(element), [])
    })
  })

  describe('.collectNearbyReferenceNodes()', () => {
    it('collects expected reference nodes', () => {

      document = domino.createDocument(`
        <sup id="cite_ref-a" class="reference"><a id='a1' href="#cite_note-a">[4]</a></sup>
        <sup id="cite_ref-b" class="reference"><a id='a2'  href="#cite_note-b">[6]</a></sup>
        <sup id="cite_ref-c" class="reference"><a id='a3'  href="#cite_note-c">[7]</a></sup>
        <span id="cite_note-a">0 1 2</span>
        <span id="cite_note-b">3 4 5</span>
        <span id="cite_note-c">6 7 8</span>
      `)

      const secondAnchor = document.querySelectorAll('A')[1]
      const nearbyRefNodes = CollectionUtilities.collectNearbyReferenceNodes(secondAnchor)

      assert.deepEqual(nearbyRefNodes.map(node => node.id), [
        'cite_ref-a',
        'a2',
        'cite_ref-c'
      ])
    })
  })  

  describe('.collectNearbyReferences()', () => {
    it('collects expected references group and selected index', () => {

      const MOCK_RECT = { top: 0, left: 1, width: 2, height: 3 }

      // Domino doesn't implement 'getBoundingClientRect' so
      // backfill it for testing methods which call it.
      var Element = domino.impl.Element
      Element.prototype.getBoundingClientRect = () => {
        return MOCK_RECT
      }

      document.documentElement.innerHTML = `
        <sup id="cite_ref-a" class="reference"><a href="#cite_note-a">[4]</a></sup>
        <sup id="cite_ref-b" class="reference"><a href="#cite_note-b">[6]</a></sup>
        <sup id="cite_ref-c" class="reference"><a href="#cite_note-c">[7]</a></sup>
        <span id="cite_note-a">0 1 2</span>
        <span id="cite_note-b">3 4 5</span>
        <span id="cite_note-c">6 7 8</span>
      `

      const secondAnchor = document.querySelectorAll('A')[1]
      const nearbyReferences = CollectionUtilities.collectNearbyReferences(document, secondAnchor)

      assert.equal(nearbyReferences.selectedIndex, 1)
      assert.deepEqual(nearbyReferences.referencesGroup, [
        { id: 'cite_ref-a',
          rect: MOCK_RECT,
          text: '[4]',
          html: '0 1 2' },
        { id: 'cite_ref-b',
          rect: MOCK_RECT,
          text: '[6]',
          html: '3 4 5' },
        { id: 'cite_ref-c',
          rect: MOCK_RECT,
          text: '[7]',
          html: '6 7 8' } 
      ])
    })
  })
})