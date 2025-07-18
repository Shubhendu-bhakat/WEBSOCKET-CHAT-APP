
import { useEffect, useRef, useState } from "react";

function App() {
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const wssref = useRef();
  const messagesEndRef = useRef();

  // Avatar colors and initials generator
  const avatarColors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
    'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
  ];

  const generateUserData = (userId) => {
    const names = ['Alex', 'Sam', 'Jordan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Sage'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const initials = randomName.substring(0, 2).toUpperCase();
    const colorIndex = userId ? userId.charCodeAt(0) % avatarColors.length : 0;
    
    return {
      id: userId || Date.now().toString(),
      name: randomName,
      initials,
      color: avatarColors[colorIndex]
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const wss = new WebSocket("ws://localhost:8080");
    
    wss.onopen = () => {
      console.log("WebSocket connected");
      const userData = generateUserData();
      setCurrentUser(userData);
      
      wss.send(JSON.stringify({
        type: "join",
        payLoad: {
          roomId: "red",
          user: userData
        }
      }));
    };

    wss.onclose = (event) => {
      console.log("WebSocket disconnected:", event.code, event.reason);
    };

    wss.onerror = (error) => {
      console.error("WebSocket error:", error);
      // Add a system message about connection issues
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        message: "Connection failed. Please check if the server is running on ws://localhost:8080",
        timestamp: new Date()
      }]);
    };

    wss.onmessage = (event) => {
      try {
        // Try to parse as JSON first
        const data = JSON.parse(event.data);
        
        switch(data.type) {
          case 'chat':
            setMessages(prev => [...prev, {
              id: Date.now(),
              user: data.user,
              message: data.message,
              timestamp: new Date(data.timestamp)
            }]);
            break;
            
          case 'user_joined':
            setConnectedUsers(prev => [...prev, data.user]);
            setMessages(prev => [...prev, {
              id: Date.now(),
              type: 'system',
              message: `${data.user.name} joined the chat`,
              timestamp: new Date()
            }]);
            break;
            
          case 'user_left':
            setConnectedUsers(prev => prev.filter(user => user.id !== data.userId));
            setMessages(prev => [...prev, {
              id: Date.now(),
              type: 'system',
              message: `${data.userName} left the chat`,
              timestamp: new Date()
            }]);
            break;
            
          case 'users_list':
            setConnectedUsers(data.users);
            break;
            
          default:
            // Handle other JSON messages
            setMessages(prev => [...prev, {
              id: Date.now(),
              type: 'system',
              message: JSON.stringify(data),
              timestamp: new Date()
            }]);
        }
      } catch (error) {
        // Handle plain text messages (like "hi ")
        const plainMessage = event.data.trim();
        if (plainMessage) {
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'system',
            message: plainMessage,
            timestamp: new Date()
          }]);
        }
      }
    };

    wssref.current = wss;

    return () => {
      wss.close();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const [inputValue, setInputValue] = useState("");

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim() && currentUser) {
      wssref.current.send(
        JSON.stringify({
          type: "chat",
          payLoad: {
            message: inputValue,
            user: currentUser,
            timestamp: new Date().toISOString()
          },
        })
      );
      setInputValue("");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col h-[600px]">
        {/* Header */}
        <div className="bg-amber-500 text-white p-4 rounded-t-xl">
          <h2 className="text-xl font-bold">Chat Room</h2>
          <p className="text-amber-100 text-sm">
            {connectedUsers.length} user{connectedUsers.length !== 1 ? 's' : ''} online
          </p>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => {
            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                    {msg.message}
                  </div>
                </div>
              );
            }

            const isCurrentUser = currentUser && msg.user.id === currentUser.id;
            
            return (
              <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-end gap-2 max-w-xs ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full ${msg.user.color} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                    {msg.user.initials}
                  </div>
                  
                  {/* Message Bubble */}
                  <div className="flex flex-col">
                    <div className={`px-4 py-2 rounded-lg ${
                      isCurrentUser 
                        ? 'bg-amber-500 text-white rounded-br-none' 
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}>
                      {!isCurrentUser && (
                        <div className="text-xs font-semibold mb-1 text-gray-600">
                          {msg.user.name}
                        </div>
                      )}
                      <div className="text-sm">{msg.message}</div>
                    </div>
                    
                    {/* Timestamp */}
                    <div className={`text-xs text-gray-500 mt-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e)}
            />
            <button
              onClick={handleSendMessage}
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!inputValue.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;