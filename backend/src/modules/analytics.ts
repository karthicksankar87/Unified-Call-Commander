import { Client } from '@elastic/elasticsearch';

const esClient = new Client({ node: 'http://localhost:9200' });

export const getAnalytics = async (metric: string, range: any): Promise<any> => {
  const result = await esClient.search({
    index: 'call-logs',
    query: { range: { timestamp: range } },
    aggs: { [metric]: { avg: { field: 'duration' } } },
  });
  return result.aggregations;
};
