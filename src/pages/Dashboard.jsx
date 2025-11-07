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
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const { data } = await api.get('/templates');
        setTemplates(data);
        if (data.length && !selectedTemplateId) {
          setSelectedTemplateId(data[0].id);
        }
      } catch (error) {
        console.error('Failed to load templates', error);
        setFeedback({ type: 'error', message: 'Could not load templates. Try refreshing.' });
      }
    }

    if (user) {
      loadTemplates();
    }
  }, [user, selectedTemplateId]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  );

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    const senderName = user?.name ?? 'Your friend';
    const computedSubject = selectedTemplate.subject.replace('{{name}}', recipientName || 'friend');
    const computedBody = selectedTemplate.body
      .replace('{{name}}', recipientName || 'friend')
      .replace('{{sender}}', senderName);

    setSubject(computedSubject);
    setBody(computedBody);
  }, [recipientName, selectedTemplate, user]);

  const handleSend = async () => {
    if (!recipientEmail) {
      setFeedback({ type: 'error', message: 'Please add the recipient email.' });
      return;
    }

    setIsSending(true);
    setFeedback(null);

    try {
      await api.post('/email/send', {
        to: recipientEmail,
        subject,
        body,
      });

      setFeedback({ type: 'success', message: 'Email sent! 🎉' });
      setRecipientEmail('');
    } catch (error) {
      console.error('Failed to send email', error);
      setFeedback({ type: 'error', message: 'Could not send email. Check the console for details.' });
    } finally {
      setIsSending(false);
    }
  };

  if (!loading && !user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>Email Studio</h1>
          <p className="subtitle">Signed in as {user?.name || 'Google User'}</p>
        </div>
        <button className="button" onClick={logout}>
          Sign out
        </button>
      </header>

      <section className="card">
        <h2>Step 1: Choose a template</h2>
        <div className="template-list">
          {templates.map((template) => (
            <button
              key={template.id}
              className={`template-chip ${template.id === selectedTemplateId ? 'template-chip--active' : ''}`}
              onClick={() => setSelectedTemplateId(template.id)}
            >
              {template.name}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Step 2: Fill in the details</h2>
        <div className="form-group">
          <label htmlFor="recipient-email">Recipient email</label>
          <input
            id="recipient-email"
            type="email"
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
            value={recipientName}
            placeholder="Your friend's name"
            onChange={(event) => setRecipientName(event.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="subject">Subject</label>
          <input id="subject" type="text" value={subject} onChange={(event) => setSubject(event.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="body">Body</label>
          <textarea
            id="body"
            rows={8}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>
        <button className="button button--primary" onClick={handleSend} disabled={isSending}>
          {isSending ? 'Sending…' : 'Send email'}
        </button>
        {feedback && <p className={`feedback feedback--${feedback.type}`}>{feedback.message}</p>}
      </section>
    </div>
  );
}


