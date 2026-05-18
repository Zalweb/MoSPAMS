import { useState, useEffect } from 'react';

interface SvgBrandColors {
 primary: string;
 secondary: string;
}

function read(): SvgBrandColors {
 if (typeof document === 'undefined') return { primary: '#ef4444', secondary: '#f97316' };
 const s = getComputedStyle(document.documentElement);
 return {
 primary: s.getPropertyValue('--brand-primary').trim() || '#ef4444',
 secondary: s.getPropertyValue('--brand-secondary').trim() || '#f97316',
 };
}

export function useSvgBrandColors(): SvgBrandColors {
 const [colors, setColors] = useState<SvgBrandColors>(read);

 useEffect(() => {
 setColors(read());
 const observer = new MutationObserver(() => setColors(read()));
 observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
 return () => observer.disconnect();
 }, []);

 return colors;
}
