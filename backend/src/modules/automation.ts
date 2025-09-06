import axios from 'axios';

export const automateRequest = async (type: string, params: any): Promise<any> => {
  if (type === 'inventory_check') {
    const response = await axios.get(`https://shopify.api/products/${params.itemId}/inventory`, {
      headers: { Authorization: `Bearer ${process.env.SHOPIFY_TOKEN}` },
    });
    if (response.status !== 200) {
      throw new Error('Inventory check failed');
    }
    return response.data;
  } else if (type === 'appointment_schedule') {
    const response = await axios.post('https://calendar.api/events', params, {
      headers: { Authorization: `Bearer ${process.env.CALENDAR_TOKEN}` },
    });
    if (response.status !== 201) {
      throw new Error('Scheduling failed');
    }
    return response.data;
  }
  throw new Error('Invalid request type');
};
