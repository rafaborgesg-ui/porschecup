
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react-swc';
  import path from 'path';

  export default defineConfig({
    plugins: [react()],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, './src'),
        'figma:asset/714dd59c6efd84795d4e42fadd6c600fd2c510ee.png': path.resolve(__dirname, './src/assets/714dd59c6efd84795d4e42fadd6c600fd2c510ee.png'),
        'figma:asset/3ae08ff326060d9638298673cda23da363101b9f.png': path.resolve(__dirname, './src/assets/3ae08ff326060d9638298673cda23da363101b9f.png'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@radix-ui/react-accordion', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
            utils: ['clsx', 'class-variance-authority', 'tailwind-merge']
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    server: {
      port: 3000,
      open: true,
    },
  });