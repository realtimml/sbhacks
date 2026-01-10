import './chat.css';

export default function ChatButton() {
  return (
    <button className="chat-button">
      <svg
        className="chat-icon"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M10 3H14C18.4183 3 22 6.58172 22 11C22 15.4183 18.4183 19 14 19V22.5C9 20.5 2 17.5 2 11C2 6.58172 5.58172 3 10 3ZM12 11V8H10V11H7V13H10V16H12V13H15V11H12Z"
          fill="currentColor"
        />
      </svg>
      <span className="chat-text">Chat</span>
    </button>
  )
}
