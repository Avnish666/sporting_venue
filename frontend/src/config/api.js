import axios from 'axios';

const API_URL = 'https://sportingvenue-7597712158.us-central1.run.app/api';

export const api = axios.create({
  baseURL: API_URL,
});

export const WS_URL = 'https://sportingvenue-7597712158.us-central1.run.app/ws-smartvenue';
