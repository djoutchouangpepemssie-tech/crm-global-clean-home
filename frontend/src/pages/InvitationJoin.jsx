import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, User, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../config.js';

const API_URL = BACKEND_URL + '/api';

export default function InvitationJoin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');
  const [step, setStep] = useState('loading'); // loading, verify-email, form, success, error
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [verificationCode, setVerificationCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);

  // Load invitation info
  useEffect(() => {
    if (!token) {
      setStep('error');
      return;
    }
    
    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/invitation/${token}`);
      const data = response.data;
      
      if (data.is_expired) {
        setStep('error');
        toast.error('Invitation expirée');
      } else {
        setInvitation(data);
        setFormData(prev => ({
          ...prev,
          name: data.name || data.email.split('@')[0]
        }));
        setStep('verify-email');
        toast.info(`Un code de vérification a été envoyé à ${data.email}`);
      }
    } catch (err) {
      setStep('error');
      toast.error('Invitation invalide');
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    
    if (!verificationCode || verificationCode.length !== 6) {
      setErrors({ code: 'Code doit contenir 6 chiffres' });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/verify-email`, {
        email: invitation.email,
        code: verificationCode,
      });
      
      setEmailVerified(true);
      setStep('form');
      setErrors({});
      toast.success('Email vérifié !');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Code invalide';
      toast.error(msg);
      setErrors({ code: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/send-verification`, {
        email: invitation.email,
        token,
      });
      toast.success('Code renvoyé à votre email');
    } catch (err) {
      toast.error('Erreur lors de l\'envoi du code');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Nom requis';
    if (!formData.password || formData.password.length < 8) {
      newErrors.password = 'Mot de passe min 8 caractères';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    if (!emailVerified) {
      toast.error('Vérifiez d\'abord votre email');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/join`, {
        token,
        name: formData.name,
        password: formData.password,
        verification_code: verificationCode,
      });
      
      // Store session token (not user_id!)
      localStorage.setItem('session_token', response.data.session_token);
      
      setStep('success');
      toast.success('Compte créé ! Bienvenue 🎉');
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Erreur lors de la création du compte';
      toast.error(msg);
      setErrors({ form: msg });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white">Vérification de l'invitation...</p>
        </div>
      </div>
    );
  }

  if (step === 'verify-email') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Vérifiez votre Email 📧</h1>
            <p className="text-slate-400">Un code de 6 chiffres a été envoyé à {invitation?.email}</p>
          </div>

          <div className="bg-slate-800/30 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Code de vérification
                </label>
                <input
                  type="text"
                  maxLength="6"
                  inputMode="numeric"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-center text-2xl font-mono placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="000000"
                />
                {errors.code && <p className="text-xs text-red-400 mt-1">{errors.code}</p>}
              </div>

              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="w-full py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  'Vérifier'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400 mb-4">Vous n'avez pas reçu le code ?</p>
              <button
                onClick={handleResendCode}
                disabled={loading}
                className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Renvoyer le code
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 border border-emerald-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Bienvenue! 🎉</h1>
          <p className="text-slate-300 mb-6">Votre compte a été créé avec succès.</p>
          <p className="text-sm text-slate-400">Redirection vers le tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (step === 'error' || !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Invitation Invalide</h1>
          <p className="text-slate-300 mb-6">L'invitation est expirée ou invalide.</p>
          <a
            href="/"
            className="inline-block px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Bienvenue! 👋</h1>
          <p className="text-slate-400">Créez votre compte pour accéder au CRM</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/30 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          {/* Invitation Info */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-300">
              <strong>Email:</strong> {invitation?.email}
            </p>
            <p className="text-sm text-slate-300">
              <strong>Rôle:</strong> <span className="text-purple-400 font-semibold capitalize">{invitation?.role}</span>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Nom
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="Votre nom complet"
              />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Mot de passe
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="Min. 8 caractères"
              />
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="Confirmer votre mot de passe"
              />
              {errors.confirmPassword && <p className="text-xs text-red-400 mt-1">{errors.confirmPassword}</p>}
            </div>

            {/* Error Message */}
            {errors.form && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-sm text-red-400">{errors.form}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer mon compte'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-xs text-slate-400 text-center mt-6">
            En créant un compte, vous acceptez nos conditions d'utilisation.
          </p>
        </div>
      </div>
    </div>
  );
}
