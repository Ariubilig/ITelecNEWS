import { useEffect, useState } from "react";


export function useFontsReady() {

  
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
  
    document.fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true);
    });
  
    return () => { cancelled = true; };
  }, []);

  return fontsReady;
  
}