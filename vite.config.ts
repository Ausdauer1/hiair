import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' 로 두면 GitHub Pages 하위 경로(/hiair/)에서도 그대로 동작해요.
export default defineConfig({
  plugins: [react()],
  base: './',
});
