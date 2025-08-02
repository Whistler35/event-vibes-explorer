import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";

const Messenger = () => {
  const navigate = useNavigate();

  const conversations = [
    {
      id: 1,
      name: "Namaste, Y'all!",
      lastMessage: "Sounds great!",
      time: "Thursday",
      avatar: "/lovable-uploads/f4be3766-dd26-4f5d-b31a-0fc8dc6465d1.png",
      isGroup: true
    },
    {
      id: 2,
      name: "Sarah",
      lastMessage: "Sounds great!",
      time: "17:58",
      avatar: "/lovable-uploads/c5cfa817-d10d-4311-808f-e2d1cb7de838.png",
      isGroup: false
    },
    {
      id: 3,
      name: "Book Club",
      lastMessage: "See you there!",
      time: "16:32",
      avatar: "/lovable-uploads/e52dcb47-6ca6-40d6-98f5-6cb7e95659d0.png",
      isGroup: true
    },
    {
      id: 4,
      name: "Family",
      lastMessage: "Please bring ice.",
      time: "15:07",
      avatar: "/lovable-uploads/b5f1b986-aaa0-4148-933c-cabcd3bb5e00.png",
      isGroup: true
    },
    {
      id: 5,
      name: "Namaste, Y'all!",
      lastMessage: "Yikes 😂",
      time: "13:24",
      avatar: "/lovable-uploads/1f219cc4-7569-43b7-9747-68323b41b3a3.png",
      isGroup: true
    },
    {
      id: 6,
      name: "John",
      lastMessage: "No problem!",
      time: "11:22",
      avatar: "/lovable-uploads/69da9fd1-98bf-4322-8993-cc5e88b359a7.png",
      isGroup: false
    },
    {
      id: 7,
      name: "Let's grab a drink",
      lastMessage: "Sure!",
      time: "09:10",
      avatar: "/lovable-uploads/0a476701-1f3e-4c0f-b23d-e9d052c0b188.png",
      isGroup: true
    },
    {
      id: 8,
      name: "Nora",
      lastMessage: "I can make it!",
      time: "Thursday",
      avatar: "/lovable-uploads/c5cfa817-d10d-4311-808f-e2d1cb7de838.png",
      isGroup: false
    }
  ];

  return (
    <Layout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-evendle-orange text-2xl font-bold">+</div>
            <span className="text-white text-xl font-bold">evendle</span>
          </div>
        </div>

        {/* Conversations List */}
        <div className="space-y-1">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => navigate(`/chat/${conversation.id}`)}
              className="flex items-center space-x-4 p-3 rounded-2xl cursor-pointer hover:bg-card/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                <img 
                  src={conversation.avatar} 
                  alt={conversation.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-lg truncate">
                    {conversation.name}
                  </h3>
                  <span className="text-evendle-gray text-sm flex-shrink-0 ml-2">
                    {conversation.time}
                  </span>
                </div>
                <p className="text-evendle-light-gray text-sm truncate">
                  {conversation.lastMessage}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Messenger;