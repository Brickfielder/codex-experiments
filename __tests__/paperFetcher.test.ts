import {
  fetchCrossrefMetadata,
  fetchPaperByIdentifier,
  fetchPubMedMetadata
} from '../src/utils/paperFetcher';
import type { RawPaper } from '../src/utils/types';

const createJsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' }
  });

const createXmlResponse = (body: string): Response =>
  new Response(body, { headers: { 'Content-Type': 'application/xml' } });

describe('paper fetcher utilities', () => {
  const crossrefPayload = {
    message: {
      DOI: '10.1000/example',
      title: ['Example cardiac arrest study'],
      abstract: '<jats:p>This is <b>important</b> science.</jats:p>',
      author: [{ given: 'Jane', family: 'Doe' }, { name: 'Research Group' }],
      subject: ['Cardiac Arrest', 'Recovery'],
      issued: { 'date-parts': [[2024, 7, 1]] },
      'container-title': ['Journal of Testing'],
      license: [{}],
      link: [{ URL: 'https://example.test/fulltext' }],
      ['pub-med-id']: '12345678'
    }
  };

  const pubmedXml = `<?xml version="1.0"?>
  <PubmedArticleSet>
    <PubmedArticle>
      <MedlineCitation>
        <PMID Version="1">12345678</PMID>
        <Article>
          <Journal>
            <JournalIssue>
              <PubDate>
                <Year>2024</Year>
                <Month>Jul</Month>
                <Day>15</Day>
              </PubDate>
            </JournalIssue>
            <Title>Journal of Testing</Title>
          </Journal>
          <ArticleTitle>Example cardiac arrest study</ArticleTitle>
          <Abstract>
            <AbstractText Label="BACKGROUND">Background text.</AbstractText>
            <AbstractText Label="RESULTS">Results text.</AbstractText>
          </Abstract>
          <AuthorList>
            <Author>
              <LastName>Doe</LastName>
              <ForeName>Jane A</ForeName>
              <Initials>JA</Initials>
            </Author>
            <Author>
              <CollectiveName>Research Group</CollectiveName>
            </Author>
          </AuthorList>
          <KeywordList>
            <Keyword>cardiac arrest</Keyword>
            <Keyword>recovery</Keyword>
          </KeywordList>
          <ArticleDate>
            <Year>2024</Year>
            <Month>Jul</Month>
            <Day>15</Day>
          </ArticleDate>
        </Article>
        <MeshHeadingList>
          <MeshHeading>
            <DescriptorName>Heart Arrest</DescriptorName>
          </MeshHeading>
        </MeshHeadingList>
        <MedlineJournalInfo>
          <Country>United States</Country>
        </MedlineJournalInfo>
      </MedlineCitation>
      <PubmedData>
        <ArticleIdList>
          <ArticleId IdType="pubmed">12345678</ArticleId>
          <ArticleId IdType="doi">10.1000/example</ArticleId>
          <ArticleId IdType="pmc">PMC1234567</ArticleId>
        </ArticleIdList>
      </PubmedData>
    </PubmedArticle>
  </PubmedArticleSet>`;

  const expectBasicFields = (record: RawPaper) => {
    expect(record.title).toBe('Example cardiac arrest study');
    expect(record.year).toBe(2024);
    expect(record.links.doi).toBe('https://doi.org/10.1000/example');
  };

  it('parses Crossref responses', async () => {
    const fetcher = jest.fn().mockResolvedValue(createJsonResponse(crossrefPayload));
    const record = await fetchCrossrefMetadata('10.1000/example', fetcher);
    expect(record).toMatchObject({
      id: '12345678',
      pmid: '12345678',
      doi: '10.1000/example',
      journal: 'Journal of Testing',
      abstract: 'This is important science.',
      authors: ['Doe, Jane', 'Research Group'],
      keywords: ['Cardiac Arrest', 'Recovery'],
      links: {
        doi: 'https://doi.org/10.1000/example',
        pubmed: 'https://pubmed.ncbi.nlm.nih.gov/12345678'
      }
    });
    expect(record.flags?.open_access).toBe(true);
    expect(record.flags?.has_fulltext).toBe(true);
    expectBasicFields(record);
  });

  it('parses PubMed XML payloads', async () => {
    const fetcher = jest.fn().mockResolvedValue(createXmlResponse(pubmedXml));
    const record = await fetchPubMedMetadata('12345678', fetcher);
    expect(record).toMatchObject({
      id: '12345678',
      pmid: '12345678',
      doi: '10.1000/example',
      pmcid: 'PMC1234567',
      journal: 'Journal of Testing',
      authors: ['Doe JA', 'Research Group'],
      mesh: ['Heart Arrest'],
      keywords: ['cardiac arrest', 'recovery'],
      country: 'United States'
    });
    expect(record.abstract).toBe('BACKGROUND: Background text.\nRESULTS: Results text.');
    expect(record.links).toEqual({
      pubmed: 'https://pubmed.ncbi.nlm.nih.gov/12345678',
      doi: 'https://doi.org/10.1000/example',
      pmc: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1234567'
    });
    expect(record.flags).toEqual({ open_access: true, has_fulltext: true });
    expectBasicFields(record);
  });

  it('merges PubMed details when looking up by DOI', async () => {
    const fetcher = jest.fn((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.startsWith('https://api.crossref.org')) {
        return Promise.resolve(createJsonResponse(crossrefPayload));
      }
      if (url.startsWith('https://eutils.ncbi.nlm.nih.gov')) {
        return Promise.resolve(createXmlResponse(pubmedXml));
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });
    const record = await fetchPaperByIdentifier({ doi: '10.1000/example' }, fetcher);
    expect(record.id).toBe('12345678');
    expect(record.pmid).toBe('12345678');
    expect(record.authors).toEqual(['Doe JA', 'Research Group']);
    expect(record.abstract).toBe('BACKGROUND: Background text.\nRESULTS: Results text.');
    expect(record.flags).toEqual({ open_access: true, has_fulltext: true });
    expectBasicFields(record);
  });
});
