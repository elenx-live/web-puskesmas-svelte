import { mount } from 'svelte';
import './app.css';
import App from './app/App.svelte';

const app = mount(App, {
  target: document.getElementById('root')!,
});

export default app;
