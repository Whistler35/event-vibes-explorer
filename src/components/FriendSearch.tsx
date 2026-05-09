import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, UserPlus, UserCheck, Clock, X, UserMinus, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileResult {
  user_id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
}

const FriendSearch: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch all friendships for current user
  const { data: friendships = [] } = useQuery({
    queryKey: ['friendships', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      if (error) throw error;
      return (data || []) as Friendship[];
    },
    enabled: !!user,
  });

  // Search profiles
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['profile-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || !user) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_url, bio')
        .neq('user_id', user.id)
        .ilike('name', `%${searchQuery}%`)
        .limit(10);
      if (error) throw error;
      return (data || []) as ProfileResult[];
    },
    enabled: searchQuery.trim().length >= 2 && !!user,
  });

  // Get accepted friends for the friend list
  const acceptedFriends = friendships.filter(f => f.status === 'accepted');
  const friendUserIds = acceptedFriends.map(f =>
    f.requester_id === user?.id ? f.addressee_id : f.requester_id
  );

  const { data: friendProfiles = [] } = useQuery({
    queryKey: ['friend-profiles', friendUserIds],
    queryFn: async () => {
      if (friendUserIds.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_url, bio')
        .in('user_id', friendUserIds);
      if (error) throw error;
      return (data || []) as ProfileResult[];
    },
    enabled: friendUserIds.length > 0,
  });

  // Pending requests received
  const pendingReceived = friendships.filter(
    f => f.status === 'pending' && f.addressee_id === user?.id
  );

  const { data: pendingProfiles = [] } = useQuery({
    queryKey: ['pending-profiles', pendingReceived.map(p => p.requester_id)],
    queryFn: async () => {
      const ids = pendingReceived.map(p => p.requester_id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_url, bio')
        .in('user_id', ids);
      if (error) throw error;
      return (data || []) as ProfileResult[];
    },
    enabled: pendingReceived.length > 0,
  });

  const sendRequest = useMutation({
    mutationFn: async (addresseeId: string) => {
      const { error } = await supabase.from('friendships').insert({
        requester_id: user!.id,
        addressee_id: addresseeId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('friendSearch.requestSent'));
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
    },
    onError: () => toast.error(t('friendSearch.requestSendError')),
  });

  const respondRequest = useMutation({
    mutationFn: async ({ friendshipId, status }: { friendshipId: string; status: string }) => {
      if (status === 'rejected') {
        // Reject = delete the row, so the requester can send a new request later
        const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('friendships')
          .update({ status, updated_at: new Date().toISOString() } as any)
          .eq('id', friendshipId);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      toast.success(vars.status === 'accepted' ? 'Freund hinzugefügt! 🎉' : 'Anfrage abgelehnt.');
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
    },
    onError: () => toast.error('Fehler beim Aktualisieren.'),
  });

  const removeFriend = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Freund entfernt.');
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
    },
    onError: () => toast.error('Fehler beim Entfernen.'),
  });

  const getFriendshipStatus = (profileUserId: string) => {
    const friendship = friendships.find(
      f =>
        (f.requester_id === user?.id && f.addressee_id === profileUserId) ||
        (f.addressee_id === user?.id && f.requester_id === profileUserId)
    );
    return friendship;
  };

  const getAvatarUrl = (profile: ProfileResult) =>
    profile.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=ff5722&color=fff&size=100`;

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Freunde suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl h-12"
        />
      </div>

      {/* Search Results */}
      {searchQuery.trim().length >= 2 && (
        <div className="space-y-2">
          <h3 className="text-foreground font-semibold text-sm">Suchergebnisse</h3>
          {isSearching ? (
            <p className="text-muted-foreground text-sm">Suche...</p>
          ) : searchResults.length === 0 ? (
            <p className="text-muted-foreground text-sm">Keine Personen gefunden.</p>
          ) : (
            searchResults.map((profile) => {
              const friendship = getFriendshipStatus(profile.user_id);
              return (
                <div key={profile.user_id} className="flex items-center gap-3 bg-card rounded-xl p-3">
                  <img
                    src={getAvatarUrl(profile)}
                    alt={profile.name}
                    className="w-10 h-10 rounded-full object-cover cursor-pointer"
                    onClick={() => navigate(`/user/${profile.user_id}`)}
                  />
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/user/${profile.user_id}`)}>
                    <p className="text-foreground font-medium text-sm truncate hover:text-primary transition-colors">{profile.name}</p>
                    {profile.bio && (
                      <p className="text-muted-foreground text-xs truncate">{profile.bio}</p>
                    )}
                  </div>
                  {!friendship ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendRequest.mutate(profile.user_id)}
                      disabled={sendRequest.isPending}
                      className="shrink-0"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  ) : friendship.status === 'pending' ? (
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Angefragt
                    </span>
                  ) : friendship.status === 'accepted' ? (
                    <span className="text-primary text-xs flex items-center gap-1">
                      <UserCheck className="h-3 w-3" /> Freund
                    </span>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pending Friend Requests */}
      {pendingReceived.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-foreground font-semibold text-sm">Freundschaftsanfragen</h3>
          {pendingReceived.map((req) => {
            const profile = pendingProfiles.find(p => p.user_id === req.requester_id);
            if (!profile) return null;
            return (
              <div key={req.id} className="flex items-center gap-3 bg-card rounded-xl p-3">
                <img
                  src={getAvatarUrl(profile)}
                  alt={profile.name}
                  className="w-10 h-10 rounded-full object-cover cursor-pointer"
                  onClick={() => navigate(`/user/${profile.user_id}`)}
                />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/user/${profile.user_id}`)}>
                  <p className="text-foreground font-medium text-sm truncate hover:text-primary transition-colors">{profile.name}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    onClick={() => respondRequest.mutate({ friendshipId: req.id, status: 'accepted' })}
                    className="bg-primary text-primary-foreground"
                  >
                    <UserCheck className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => respondRequest.mutate({ friendshipId: req.id, status: 'rejected' })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Friends List */}
      <div className="space-y-2">
        <h3 className="text-foreground font-semibold text-sm">
          Freunde {friendProfiles.length > 0 && `(${friendProfiles.length})`}
        </h3>
        {friendProfiles.length === 0 ? (
          <p className="text-muted-foreground text-sm">Noch keine Freunde hinzugefügt.</p>
        ) : (
          friendProfiles.map((profile) => {
            const friendship = getFriendshipStatus(profile.user_id);
            return (
              <div key={profile.user_id} className="flex items-center gap-3 bg-card rounded-xl p-3">
                <img
                  src={getAvatarUrl(profile)}
                  alt={profile.name}
                  className="w-10 h-10 rounded-full object-cover cursor-pointer"
                  onClick={() => navigate(`/user/${profile.user_id}`)}
                />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/user/${profile.user_id}`)}>
                  <p className="text-foreground font-medium text-sm truncate hover:text-primary transition-colors">{profile.name}</p>
                  {profile.bio && (
                    <p className="text-muted-foreground text-xs truncate">{profile.bio}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!user) return;
                      const { data } = await supabase.rpc("get_or_create_dm", {
                        p_user1: user.id,
                        p_user2: profile.user_id,
                      });
                      if (data) navigate(`/dm/${data}`);
                    }}
                    className="text-primary hover:text-primary/80"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => friendship && removeFriend.mutate(friendship.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FriendSearch;
