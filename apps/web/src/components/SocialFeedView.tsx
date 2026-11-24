import React, { useState } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Send, 
  MapPin, 
  Timer, 
  Gauge, 
  Image as ImageIcon,
  Sparkles,
  Flame
} from 'lucide-react';
import { SocialPost, UserProfile, SportType } from '../types';

interface SocialFeedViewProps {
  posts: SocialPost[];
  currentUser: UserProfile;
  onLikePost: (postId: string) => void;
  onAddComment: (postId: string, content: string) => void;
  onCreatePost: (content: string, sport: SportType) => void;
}

export const SocialFeedView: React.FC<SocialFeedViewProps> = ({
  posts,
  currentUser,
  onLikePost,
  onAddComment,
  onCreatePost,
}) => {
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedSport, setSelectedSport] = useState<SportType>('running');
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;
    onCreatePost(newPostContent.trim(), selectedSport);
    setNewPostContent('');
  };

  const handleCommentSubmit = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    onAddComment(postId, text);
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Post Creator Box */}
      <div className="bg-[#1B263B] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center space-x-3">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FF6B35]"
          />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-white">{currentUser.name}</h4>
            <p className="text-xs text-gray-400">Share your latest workout, motivation, or question</p>
          </div>
        </div>

        <form onSubmit={handlePostSubmit} className="space-y-3">
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="How was your workout today? Share your thoughts, route highlights, or ask for running buddies..."
            rows={3}
            className="w-full bg-[#0D1B2A] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#FF6B35] transition-colors resize-none"
          />

          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400 font-medium">Activity:</span>
              <select
                aria-label="Select post activity sport"
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value as SportType)}
                className="bg-[#0D1B2A] text-xs font-semibold text-gray-200 border border-white/10 rounded-lg px-2.5 py-1 outline-none"
              >
                <option value="running">🏃 Running</option>
                <option value="cycling">🚴 Cycling</option>
                <option value="hiking">🥾 Hiking</option>
                <option value="yoga">🧘 Yoga</option>
                <option value="fitness">💪 Fitness</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!newPostContent.trim()}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#FF6B35] text-white hover:bg-[#ff8254] transition-all disabled:opacity-40 disabled:hover:bg-[#FF6B35] shadow-md shadow-orange-500/20"
            >
              Post Activity
            </button>
          </div>
        </form>
      </div>

      {/* Posts List */}
      <div className="space-y-5">
        {posts.map(post => {
          return (
            <div
              key={post.id}
              className="bg-[#1B263B] border border-white/10 rounded-2xl overflow-hidden shadow-lg space-y-4 p-5"
            >
              {/* Author Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={post.author.avatar}
                    alt={post.author.name}
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-white/20"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-heading font-bold text-sm text-white">{post.author.name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/15 text-[#FF6B35] border border-orange-500/30">
                        {post.author.level}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400">@{post.author.username} • {post.createdAt}</span>
                  </div>
                </div>

                <span className="text-xs uppercase font-bold px-2.5 py-1 rounded-full bg-white/5 text-gray-300 border border-white/10">
                  {post.sport}
                </span>
              </div>

              {/* Post Text */}
              <p className="text-sm text-gray-200 leading-relaxed">
                {post.content}
              </p>

              {/* Run Summary Card if attached */}
              {post.runSummary && (
                <div className="bg-[#0D1B2A] border border-white/10 rounded-xl p-3.5 flex items-center justify-around">
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Distance</span>
                    <div className="text-base font-heading font-extrabold text-[#FF6B35]">
                      {post.runSummary.distanceKm} km
                    </div>
                  </div>
                  <div className="h-8 w-px bg-white/10" />
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Duration</span>
                    <div className="text-base font-heading font-extrabold text-[#2AB7CA]">
                      {post.runSummary.durationFormatted}
                    </div>
                  </div>
                  <div className="h-8 w-px bg-white/10" />
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Avg Pace</span>
                    <div className="text-base font-heading font-extrabold text-[#FED766]">
                      {post.runSummary.avgPace}
                    </div>
                  </div>
                </div>
              )}

              {/* Post Image */}
              {post.imageUrl && (
                <div className="rounded-xl overflow-hidden max-h-80 border border-white/5">
                  <img
                    src={post.imageUrl}
                    alt="Workout highlight"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Likes & Comments Counters */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-gray-400">
                <button
                  onClick={() => onLikePost(post.id)}
                  className={`flex items-center space-x-1.5 transition-colors ${
                    post.likedByMe ? 'text-[#FF6B35] font-bold' : 'hover:text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${post.likedByMe ? 'fill-[#FF6B35]' : ''}`} />
                  <span>{post.likesCount} Kudos</span>
                </button>

                <div className="flex items-center space-x-1.5">
                  <MessageCircle className="w-4 h-4" />
                  <span>{post.comments.length} Comments</span>
                </div>
              </div>

              {/* Comments Section */}
              {post.comments.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-white/5">
                  {post.comments.map(comment => (
                    <div key={comment.id} className="flex items-start space-x-2.5 bg-[#0D1B2A]/60 p-2.5 rounded-xl border border-white/5">
                      <img
                        src={comment.author.avatar}
                        alt={comment.author.name}
                        className="w-6 h-6 rounded-full object-cover ring-1 ring-white/10 mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{comment.author.name}</span>
                          <span className="text-[10px] text-gray-400">{comment.createdAt}</span>
                        </div>
                        <p className="text-xs text-gray-300 mt-0.5">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Comment Input */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="text"
                  value={commentInputs[post.id] || ''}
                  onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCommentSubmit(post.id);
                  }}
                  placeholder="Cheer on this run or leave a comment..."
                  className="flex-1 bg-[#0D1B2A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#FF6B35] transition-colors"
                />
                <button
                  onClick={() => handleCommentSubmit(post.id)}
                  className="p-2 rounded-xl bg-[#2AB7CA]/20 text-[#2AB7CA] hover:bg-[#2AB7CA]/30 transition-colors"
                  title="Send comment"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
