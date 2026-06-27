/**
 * Applies the saved theme before first paint to avoid a flash of the wrong
 * theme. Server-rendered into <head> as a blocking inline script.
 */
export function ThemeScript() {
  const code = `(function(){try{if(localStorage.getItem('zoom.theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
