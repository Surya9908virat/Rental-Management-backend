import Message from "../models/message.model.js";
import Lease from "../models/lease.model.js";
import User from "../models/user.model.js";

// Send Message
export const sendMessage = async (req, res) => {
    try {
        const { relationId, content } = req.body;
        if (!relationId || !content) {
            return res.status(400).json({ message: "Relation ID and content are required" });
        }

        const message = await Message.create({
            relationId,
            sender: req.user._id,
            content
        });

        const populatedMessage = await Message.findById(message._id).populate("sender", "name role");

        // SOCKET EMIT: Real-time update
        const io = req.app.get("io");
        if (io) {
            console.log(`EMITTING TO ROOM: ${relationId}`);
            io.to(relationId.toString()).emit("new-message", populatedMessage);
        }

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error("SEND MESSAGE ERROR:", error);
        res.status(500).json({ message: "Failed to send message" });
    }
};

// Get all conversations (based on leases)
export const getConversations = async (req, res) => {
    try {
        console.log(`FETCHING CONVERSATIONS for User: ${req.user._id}, Role: ${req.user.role}`);
        const query = req.user.role === 'landlord' ? { landlord: req.user._id } : { tenant: req.user._id };
        const leases = await Lease.find(query).populate("property").populate(req.user.role === 'landlord' ? "tenant" : "landlord", "name");
        
        // Group by user to ensure "user name only show once"
        const groupedMap = new Map();
        
        for (const lease of leases) {
            const otherUser = req.user.role === 'landlord' ? lease.tenant : lease.landlord;
            if (!otherUser) continue;
            
            const userId = otherUser._id.toString();
            
            // If already added, we could potentially update if this lease is newer, 
            // but for now, first one found is fine since we sort by createdAt in find if needed.
            if (!groupedMap.has(userId)) {
                groupedMap.set(userId, lease);
            }
        }

        const uniqueLeases = Array.from(groupedMap.values());

        const conversations = await Promise.all(uniqueLeases.map(async (lease) => {
            const lastMessage = await Message.findOne({ relationId: lease._id }).sort({ createdAt: -1 }).populate("sender", "name");
            const otherUser = req.user.role === 'landlord' ? lease.tenant : lease.landlord;
            
            return {
                id: lease._id,
                name: otherUser?.name,
                property: lease.property?.address,
                lastMsg: lastMessage ? lastMessage.content : "No messages yet",
                time: lastMessage ? lastMessage.createdAt : lease.createdAt,
                unread: 0,
                landlord: req.user.role === 'tenant' ? {
                    id: lease.landlord?._id,
                    name: lease.landlord?.name,
                    upiId: lease.landlord?.upiId
                } : null
            };
        }));

        res.json(conversations);
    } catch (error) {
        console.error("GET CONVERSATIONS ERROR:", error);
        res.status(500).json({ message: "Failed to fetch conversations" });
    }
};

// Get Messages for a relation
export const getMessages = async (req, res) => {
    try {
        const { relationId } = req.params;
        const messages = await Message.find({ relationId })
            .populate("sender", "name role")
            .sort({ createdAt: 1 });
        res.json(messages);
    } catch (error) {
        console.error("GET MESSAGES ERROR:", error);
        res.status(500).json({ message: "Failed to fetch messages" });
    }
};
// Search users to start a new chat
export const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.json([]);

        const users = await User.find({
            $and: [
                { _id: { $ne: req.user._id } },
                {
                    $or: [
                        { name: { $regex: query, $options: 'i' } },
                        { email: { $regex: query, $options: 'i' } }
                    ]
                }
            ]
        }).select("name role email").limit(10);

        res.json(users);
    } catch (error) {
        console.error("SEARCH USERS ERROR:", error);
        res.status(500).json({ message: "Failed to search users" });
    }
};

// Mark messages as read
export const markAsRead = async (req, res) => {
    try {
        const { relationId } = req.body;
        if (!relationId) return res.status(400).json({ message: "Relation ID is required" });

        await Message.updateMany(
            { relationId, sender: { $ne: req.user._id }, status: { $ne: 'read' } },
            { $set: { status: 'read' } }
        );
        
        const io = req.app.get("io");
        io.to(relationId.toString()).emit("messages-read", { relationId });

        res.json({ success: true });
    } catch (error) {
        console.error("MARK AS READ ERROR:", error);
        res.status(500).json({ message: "Failed to mark messages as read" });
    }
};
