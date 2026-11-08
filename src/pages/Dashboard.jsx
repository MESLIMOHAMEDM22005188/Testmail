import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;

    async function loadTemplates() {
      setIsLoadingTemplates(true);
      try {
        const { data } = await api.get('/templates');
        if (!active) return;
        const safeTemplates = Array.isArray(data) ? data : [];
        setTemplates(safeTemplates);
        setSelectedTemplateId((current) => current || safeTemplates[0]?.id || '');
      } catch (error) {
        console.error('Failed to load templates:', error.message);
        if (active) setFeedback({ type: 'error', message: 'Templates could not be loaded. Please refresh the page.' });
      } finally {
        if (active) setIsLoadingTemplates(false);
      }
    }

    loadTemplates();
    return () => {
      active = false;
    };
  }, [user]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  useEffect(() => {
    if (!selectedTemplate) return;
    const senderName = user?.name ?? 'Your friend';
    const name = recipientName.trim() || 'friend';
    setSubject(selectedTemplate.subject.replaceAll('{{name}}', name).replaceAll('{{sender}}', senderName));
    setBody(selectedTemplate.body.replaceAll('{{name}}', name).replaceAll('{{sender}}', senderName));
  }, [recipientName, selectedTemplate, user]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(recipientEmail.trim())) {
      setFeedback({ type: 'error', message: 'Enter a valid recipient email address.' });
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setFeedback({ type: 'error', message: 'Subject and message body are required.' });
      return;
    }

    setIsSending(true);
    setFeedback(null);
    try {
      await api.post('/email/send', {
        to: recipientEmail.trim(),
        subject,
        body,
      });
      setFeedback({ type: 'success', message: 'Your email was sent successfully.' });
      setRecipientEmail('');
    } catch (error) {
      const message = error.response?.data?.message || 'Email could not be sent. Please try again.';
      setFeedback({ type: 'error', message });
      if (error.response?.status === 401) await logout();
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return <main className="page page--centered"><p role="status">Checking your session…</p></main>;
  }
  if (!user) return <Navigate to="/" replace />;

  return (
    <main className="page">
      <header className="page__header">
        <div>
          <p className="eyebrow">TESTMAIL WORKSPACE</p>
          <h1>Email Studio</h1>
          <p className="subtitle">Signed in as {user.email || user.name || 'Google User'}</p>
        </div>
        <button className="button" type="button" onClick={logout}>Sign out</button>
      </header>

      <section className="card">
        <div>
          <p className="eyebrow">01 / TEMPLATE</p>
          <h2>Start with a template</h2>
          <p className="subtitle">Choose a starting point. You can edit every field before sending.</p>
        </div>
        {isLoadingTemplates ? <p role="status">Loading templates…</p> : (
          <div className="template-list">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`template-chip ${template.id === selectedTemplateId ? 'template-chip--active' : ''}`}
                aria-pressed={template.id === selectedTemplateId}
                onClick={() => setSelectedTemplateId(template.id)}
              >
                {template.name}
              </button>
            ))}
            {!templates.length && <p className="subtitle">No templates are currently available.</p>}
          </div>
        )}
      </section>

      <form className="card" onSubmit={handleSend}>
        <div>
          <p className="eyebrow">02 / COMPOSE</p>
          <h2>Write your message</h2>
          <p className="subtitle">Review the recipient, subject and message before sending.</p>
        </div>
        <div className="form-group">
          <label htmlFor="recipient-email">Recipient email</label>
          <input
            id="recipient-email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={recipientEmail}
            placeholder="friend@example.com"
            onChange={(event) => setRecipientEmail(event.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="recipient-name">Recipient name</label>
          <input
            id="recipient-name"
            type="text"
            maxLength={120}
            value={recipientName}
            placeholder="Your friend's name"
            onChange={(event) => setRecipientName(event.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="subject">Subject</label>
          <input id="subject" type="text" required maxLength={998} value={subject} onChange={(event) => setSubject(event.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="body">Message</label>
          <textarea id="body" rows={9} required maxLength={100000} value={body} onChange={(event) => setBody(event.target.value)} />
        </div>
        <div className="compose-footer">
          <p className="footer-text">Messages are sent through the Gmail account connected to this session.</p>
          <button className="button button--primary" type="submit" disabled={isSending || isLoadingTemplates || !templates.length}>
            {isSending ? 'Sending…' : 'Send email'}
          </button>
        </div>
        {feedback && <p className={`feedback feedback--${feedback.type}`} role="status">{feedback.message}</p>}
      </form>
    </main>
  );
}
