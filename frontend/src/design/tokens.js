export const colors = {
  brand: { 50:'#ECFDF5',100:'#D1FAE5',200:'#A7F3D0',300:'#6EE7B7',400:'#34D399',500:'#10B981',600:'#059669',700:'#047857',800:'#065F46',900:'#064E3B' },
  accent: { 50:'#FEF6F1',100:'#FDEAE0',200:'#FAD0BB',300:'#F4A87F',500:'#D97757',600:'#C25E40',700:'#A04A30' },
  success: { 50:'#ECFDF5',100:'#D1FAE5',500:'#10B981',600:'#059669' },
  warning: { 50:'#FEFCE8',100:'#FEF3C7',500:'#EAB308',600:'#CA8A04' },
  danger:  { 50:'#FEF2F2',100:'#FEE2E2',500:'#DC2626',600:'#B91C1C' },
  neutral: { 0:'#FFFFFF',50:'#FBFAF6',100:'#F5F2EB',200:'#ECE7DC',300:'#DBD3C2',400:'#A89E89',500:'#736B5C',600:'#544E43',700:'#3A3631',800:'#26241F',900:'#1A1814',950:'#0F0E0B' },
};
export const typography = {
  fontFamily: {
    display: '"Fraunces", "Instrument Serif", Georgia, serif',
    body: '"Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
};
export const shadows = {
  sm: '0 1px 3px 0 rgba(38,36,31,0.06)',
  md: '0 4px 8px -2px rgba(38,36,31,0.06)',
  lg: '0 10px 20px -4px rgba(38,36,31,0.06)',
  brand: '0 8px 24px -6px rgba(5,150,105,0.28)',
};
const tokens = { colors, typography, shadows };
export default tokens;
