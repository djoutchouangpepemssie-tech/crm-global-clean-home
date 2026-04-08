# 🔍 DEBUG — Paie & RH Module Not Showing

## Symptoms
- "Notes de Frais" / "Contrats" / "Intervenants RH" pages don't display
- No error in console (probably)
- Module defined but not rendering

## Likely Causes

1. **Missing API Endpoint**
   - `GET /api/payroll-rh/stats` → 404 or undefined
   - Any other endpoint missing

2. **Component Not Exported**
   - PayrollRHModule not exported as default
   - Sub-components missing

3. **State Hook Error**
   - useState called wrong order
   - useCallback/useEffect error

4. **Import Missing**
   - Icon not found (lucide-react)
   - UI component not found

## Quick Fixes

### 1. Check Browser Console
```
F12 → Console tab
Look for: 
  - Red errors (❌)
  - Network 404s (🔴)
  - Warnings (⚠️)
```

### 2. Check Network Tab
```
F12 → Network tab → Filter "payroll"
Look for failing requests:
  - /api/payroll-rh/stats → should be 200 OK
```

### 3. Check if Backend is Responding
```bash
curl -H "Authorization: Bearer test" \
  https://crm-global-clean-home-production.up.railway.app/api/payroll-rh/stats
```

## Solutions

### Option A: Use Fallback Component
If API not responding, return empty state gracefully

### Option B: Fix Missing Endpoints
Add missing endpoints to backend

### Option C: Simplify Module
Remove complex state, render static content first
