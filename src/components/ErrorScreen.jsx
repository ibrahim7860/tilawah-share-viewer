const MESSAGES = {
  revoked: 'This shared Qur’an link is no longer active.',
  invalid: 'This link doesn’t look right.',
  unsupported: 'This Qur’an edition isn’t supported in the web viewer yet.',
}

export default function ErrorScreen({ kind, owner }) {
  const message = MESSAGES[kind] || MESSAGES.invalid
  return (
    <div className="error-screen" role="alert">
      <div className="error-card">
        {owner && <p className="error-owner">{owner}</p>}
        <p className="error-message">{message}</p>
      </div>
    </div>
  )
}
