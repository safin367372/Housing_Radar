import { useState } from 'react'

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="chatbot-widget">
      {isOpen && (
        <section className="chat-panel" role="dialog" aria-modal="false" aria-labelledby="chat-title">
          <div className="chat-header">
            <div className="chat-avatar" aria-hidden="true"><ChatIcon /></div>
            <div className="chat-heading">
              <h2 id="chat-title">HousingRadar assistant</h2>
              <span><i /> Preview</span>
            </div>
            <button className="chat-close" onClick={() => setIsOpen(false)} aria-label="Close chat">×</button>
          </div>
          <div className="chat-body">
            <span className="chat-date">HERE TO HELP</span>
            <div className="chat-message">
              <p>The assistant will help you compare places, amenities, and rates. The chat service is not connected yet.</p>
              <small>HousingRadar assistant</small>
            </div>
          </div>
          <div className="chat-compose">
            <input aria-label="Chat message" placeholder="Chat will be available soon" disabled />
            <button aria-label="Send message" disabled><SendIcon /></button>
          </div>
        </section>
      )}
      <button className={`chat-launcher${isOpen ? ' is-open' : ''}`} onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen} aria-label={isOpen ? 'Close HousingRadar assistant' : 'Open HousingRadar assistant'}>
        {isOpen ? <CloseIcon /> : <ChatIcon />}
        {!isOpen && <span>Ask us</span>}
      </button>
    </div>
  )
}

function ChatIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.5-3A7.5 7.5 0 1 1 20 11.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M8.5 11.5h.01m3.49 0H12m3.49 0h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
}
function CloseIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> }
function SendIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m21 3-7.2 18-3.7-7.1L3 10.2 21 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="m10.1 13.9 4.3-4.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg> }
