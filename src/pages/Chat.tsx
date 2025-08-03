import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import Layout from "@/components/Layout";
import yogaEventImage from "@/assets/yoga-event-new.jpg";

const Chat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");

  // Mock chat data - would be fetched based on id
  const chat = {
    name: "Namaste, Y'all! – Americans at the Yoga Fest",
    avatar: "/lovable-uploads/f4be3766-dd26-4f5d-b31a-0fc8dc6465d1.png",
    messages: [
      {
        id: 1,
        sender: "Tom",
        avatar: "/lovable-uploads/c5cfa817-d10d-4311-808f-e2d1cb7de838.png",
        message: "Who's ready to strike a pose? 🇺🇸",
        time: "9:47 AM"
      },
      {
        id: 2,
        sender: "Sarah",
        avatar: "/lovable-uploads/b5f1b986-aaa0-4148-933c-cabcd3bb5e00.png",
        message: "Can't wait! See y'all on the mat!",
        time: "9:48 AM"
      },
      {
        id: 3,
        sender: "Kyle",
        avatar: "/lovable-uploads/69da9fd1-98bf-4322-8993-cc5e88b359a7.png",
        message: "Looking forward to this! 🧘",
        time: "9:48 AM"
      },
      {
        id: 4,
        sender: "Emily",
        avatar: "/lovable-uploads/0a476701-1f3e-4c0f-b23d-e9d052c0b188.png",
        message: "Feel free to join, y'all! ✌️",
        time: "9:49 AM"
      }
    ]
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      // In real app, would send message to backend
      console.log("Sending message:", message);
      setMessage("");
    }
  };

  return (
    <Layout showBottomNav={false}>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center space-x-4 p-4 border-b border-border">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full"
          >
            <ArrowLeft className="text-evendle-orange" size={24} />
            <span className="text-white ml-2">evendle</span>
          </button>
        </div>

        {/* Event Info */}
        <div className="p-4 border-b border-border">
          <div className="bg-card rounded-2xl overflow-hidden">
            <img 
              src={yogaEventImage} 
              alt={chat.name}
              className="w-full h-32 object-cover"
            />
            <div className="p-4">
              <h2 className="text-white font-bold text-lg">{chat.name}</h2>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chat.messages.map((msg) => (
            <div key={msg.id} className="flex space-x-3">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                <img 
                  src={msg.avatar} 
                  alt={msg.sender}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-white font-semibold">{msg.sender}</span>
                  <span className="text-evendle-gray text-sm">{msg.time}</span>
                </div>
                <div className="bg-evendle-dark-card rounded-2xl rounded-tl-none px-4 py-2">
                  <p className="text-white">{msg.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message..."
              className="flex-1 bg-evendle-dark-card rounded-full px-4 py-3 text-white placeholder-evendle-gray focus:outline-none focus:ring-2 focus:ring-evendle-orange"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              className="p-3 bg-evendle-orange rounded-full hover:bg-evendle-orange-hover transition-colors"
            >
              <Send className="text-white" size={20} />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Chat;