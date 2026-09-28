import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/onest';
import './styles/app.css';
import './styles/glass.css';
import { mount } from 'svelte';
import App from './App.svelte';

mount(App, { target: document.getElementById('app') });
