import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const PaymentSuccess = () => {
  const { invoiceId } = useParams();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('checking'); // checking, paid, failed
  const [invoice, setInvoice] = useState(null);

  const pollStatus = useCallback(async (attempts = 0) => {
    if (attempts >= 6) {
      setStatus('failed');
      return;
    }

    try {
      const res = await axios.get(
        `${API_URL}/invoices/${invoiceId}/payment-status?session_id=${sessionId}`,
        { withCredentials: true }
      );

      if (res.data.payment_status === 'paid') {
        setStatus('paid');
        // Fetch updated invoice
        const invRes = await axios.get(`${API_URL}/invoices/${invoiceId}`, { withCredentials: true });
        setInvoice(invRes.data);
        return;
      }

      if (res.data.status === 'expired') {
        setStatus('failed');
        return;
      }

      // Continue polling
      setTimeout(() => pollStatus(attempts + 1), 2000);
    } catch {
      setTimeout(() => pollStatus(attempts + 1), 2000);
    }
  }, [invoiceId, sessionId]);

  useEffect(() => {
    if (sessionId) {
      pollStatus();
    }
  }, [sessionId, pollStatus]);

  return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]" data-testid="payment-success-page">
      <div className="max-w-md w-full text-center">
        {status === 'checking' && (
          <div>
            <p className="text-sm text-neutral-400">Verification du paiement...</p>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Vérification du paiement...</h1>
            <p className="text-neutral-600">Veuillez patienter pendant que nous confirmons votre paiement.</p>
          </div>
        )}

        {status === 'paid' && (
          <div>
            <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-brand-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Paiement confirmé !</h1>
            <p className="text-neutral-600 mb-6">
              Votre paiement de {invoice ? formatCurrency(invoice.amount_ttc) : ''} a été traité avec succès.
            </p>
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-left">
              <p className="text-sm text-brand-800">
                <span className="font-semibold">Facture :</span> {invoiceId}
              </p>
              {invoice && (
                <>
                  <p className="text-sm text-brand-800 mt-1">
                    <span className="font-semibold">Client :</span> {invoice.lead_name}
                  </p>
                  <p className="text-sm text-brand-800 mt-1">
                    <span className="font-semibold">Service :</span> {invoice.service_type}
                  </p>
                </>
              )}
            </div>
            <a
              href="/invoices"
              className="inline-block mt-6 px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
            >
              Retour aux factures
            </a>
          </div>
        )}

        {status === 'failed' && (
          <div>
            <div className="w-20 h-20 rounded-full bg-terracotta-100 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-terracotta-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Paiement non confirmé</h1>
            <p className="text-neutral-600 mb-6">
              Le paiement n'a pas pu être vérifié. Contactez-nous si le montant a été débité.
            </p>
            <a
              href="/invoices"
              className="inline-block px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
            >
              Retour aux factures
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
