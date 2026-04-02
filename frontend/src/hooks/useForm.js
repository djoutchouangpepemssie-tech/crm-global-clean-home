import { useState, useCallback } from 'react';

/**
 * Hook useForm - validation inline en temps réel
 */
const useForm = (initialValues, validationRules = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = useCallback((fieldValues = values) => {
    const newErrors = {};
    
    Object.keys(validationRules).forEach(field => {
      const rules = validationRules[field];
      const value = fieldValues[field];
      
      if (rules.required && (!value || String(value).trim() === '')) {
        newErrors[field] = `${rules.label || field} est requis`;
        return;
      }
      
      if (value && rules.minLength && String(value).length < rules.minLength) {
        newErrors[field] = `Minimum ${rules.minLength} caractères`;
        return;
      }
      
      if (value && rules.maxLength && String(value).length > rules.maxLength) {
        newErrors[field] = `Maximum ${rules.maxLength} caractères`;
        return;
      }
      
      if (value && rules.pattern && !rules.pattern.test(String(value))) {
        newErrors[field] = rules.patternMessage || 'Format invalide';
        return;
      }
      
      if (value && rules.min && Number(value) < rules.min) {
        newErrors[field] = `Minimum ${rules.min}`;
        return;
      }
      
      if (value && rules.max && Number(value) > rules.max) {
        newErrors[field] = `Maximum ${rules.max}`;
        return;
      }
      
      if (rules.custom) {
        const customError = rules.custom(value, fieldValues);
        if (customError) newErrors[field] = customError;
      }
    });
    
    return newErrors;
  }, [values, validationRules]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setValues(prev => ({ ...prev, [name]: newValue }));
    
    // Validation en temps réel sur les champs touchés
    if (touched[name]) {
      const newErrors = validate({ ...values, [name]: newValue });
      setErrors(prev => ({ ...prev, [name]: newErrors[name] }));
    }
  }, [values, touched, validate]);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const newErrors = validate();
    setErrors(prev => ({ ...prev, [name]: newErrors[name] }));
  }, [validate]);

  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  const handleSubmit = useCallback((onSubmit) => async (e) => {
    e?.preventDefault();
    
    // Marquer tous les champs comme touchés
    const allTouched = Object.keys(validationRules).reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setTouched(allTouched);
    
    const newErrors = validate();
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, validationRules]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const isValid = Object.keys(validate()).length === 0;

  return {
    values, errors, touched, isSubmitting, isValid,
    handleChange, handleBlur, handleSubmit,
    setValue, setFieldError, reset,
    // Helper pour les props d'un input
    getFieldProps: (name) => ({
      name,
      value: values[name] ?? '',
      onChange: handleChange,
      onBlur: handleBlur,
    }),
  };
};

export default useForm;
