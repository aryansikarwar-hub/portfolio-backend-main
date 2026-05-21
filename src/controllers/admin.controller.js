import { Project } from '../models/Project.js'
import { BlogPost } from '../models/BlogPost.js'
import { Hobby } from '../models/Hobby.js'
import { Certificate } from '../models/Certificate.js'
import { ContactMessage } from '../models/ContactMessage.js'
import { Comment } from '../models/Comment.js'
import { Subscriber } from '../models/Subscriber.js'
import { PageView } from '../models/PageView.js'
import { asyncHandler } from '../utils/asyncHandler.js'

/**
 * One round-trip the dashboard hits on load. We do every count in parallel
 * and ship the whole "summary card grid" payload in a single response.
 */
export const dashboard = asyncHandler(async (_req, res) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [
        projectCount, publishedProjects,
        postCount, publishedPosts,
        hobbyCount, certificateCount,
        newMessages, totalMessages,
        pendingComments, totalComments,
        confirmedSubs, pendingSubs,
        viewsLast7d,
        recentMessages,
        recentComments,
    ] = await Promise.all([
        Project.estimatedDocumentCount(),
        Project.countDocuments({ published: true }),
        BlogPost.estimatedDocumentCount(),
        BlogPost.countDocuments({ published: true }),
        Hobby.estimatedDocumentCount(),
        Certificate.estimatedDocumentCount(),
        ContactMessage.countDocuments({ status: 'new' }),
        ContactMessage.estimatedDocumentCount(),
        Comment.countDocuments({ status: 'pending' }),
        Comment.estimatedDocumentCount(),
        Subscriber.countDocuments({ status: 'confirmed' }),
        Subscriber.countDocuments({ status: 'pending' }),
        PageView.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
        ContactMessage.find().sort({ createdAt: -1 }).limit(5).select('name email subject status createdAt').lean(),
        Comment.find().populate('post', 'title slug').sort({ createdAt: -1 }).limit(5).lean(),
    ])

    res.json({
        success: true,
        data: {
            content: {
                projects: { total: projectCount, published: publishedProjects },
                blogPosts: { total: postCount, published: publishedPosts },
                hobbies: { total: hobbyCount },
                certificates: { total: certificateCount },
            },
            inbox: {
                contactMessages: { new: newMessages, total: totalMessages },
                pendingComments: { pending: pendingComments, total: totalComments },
            },
            newsletter: {
                confirmed: confirmedSubs,
                pending: pendingSubs,
            },
            traffic: {
                viewsLast7d,
            },
            recent: {
                messages: recentMessages,
                comments: recentComments,
            },
        },
    })
})
