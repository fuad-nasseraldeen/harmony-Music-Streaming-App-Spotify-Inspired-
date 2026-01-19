import type { GraphQLContext } from './context';
import { GraphQLScalarType } from 'graphql';
import type { ValueNode } from 'graphql';

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize(value) {
    return value;
  },
  parseValue(value) {
    return value;
  },
  parseLiteral(ast: ValueNode) {
    if (ast.kind === 'StringValue') return ast.value;
    if (ast.kind === 'IntValue') return parseInt(ast.value, 10);
    if (ast.kind === 'FloatValue') return parseFloat(ast.value);
    if (ast.kind === 'BooleanValue') return ast.value;
    if (ast.kind === 'NullValue') return null;
    return null;
  },
});

// Helper function to transform snake_case to camelCase
function transformSong(song: any) {
  if (!song) return song;
  return {
    ...song,
    userId: song.user_id,
    songPath: song.song_path,
    imagePath: song.image_path,
    createdAt: song.created_at,
  };
}

export const resolvers = {
  JSON: JSONScalar,
  Song: {
    userId: (parent: any) => parent.user_id || parent.userId,
    songPath: (parent: any) => parent.song_path || parent.songPath,
    imagePath: (parent: any) => parent.image_path || parent.imagePath,
    createdAt: (parent: any) => parent.created_at || parent.createdAt,
  },
  Product: {
    prices: (parent: any) => parent.prices || [],
  },
  Price: {
    productId: (parent: any) => parent.product_id || parent.productId,
    trialPeriodDays: (parent: any) => parent.trial_period_days || parent.trialPeriodDays,
    intervalCount: (parent: any) => parent.interval_count || parent.intervalCount,
    unitAmount: (parent: any) => parent.unit_amount || parent.unitAmount,
  },
  Subscription: {
    userId: (parent: any) => parent.user_id || parent.userId,
    priceId: (parent: any) => parent.price_id || parent.priceId,
    cancelAtPeriodEnd: (parent: any) => parent.cancel_at_period_end ?? parent.cancelAtPeriodEnd,
    currentPeriodStart: (parent: any) => parent.current_period_start || parent.currentPeriodStart,
    currentPeriodEnd: (parent: any) => parent.current_period_end || parent.currentPeriodEnd,
    endedAt: (parent: any) => parent.ended_at || parent.endedAt,
    cancelAt: (parent: any) => parent.cancel_at || parent.cancelAt,
    canceledAt: (parent: any) => parent.canceled_at || parent.canceledAt,
    trialStart: (parent: any) => parent.trial_start || parent.trialStart,
    trialEnd: (parent: any) => parent.trial_end || parent.trialEnd,
  },
  User: {
    fullName: (parent: any) => parent.full_name || parent.fullName,
    avatarUrl: (parent: any) => parent.avatar_url || parent.avatarUrl,
  },
  Query: {
    // Get all songs
    songs: async (_: unknown, __: unknown, context: GraphQLContext) => {
      const { data, error } = await context.supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []).map(transformSong);
    },

    // Get song by ID
    song: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      const { data, error } = await context.supabase
        .from('songs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw new Error(error.message);
      return transformSong(data);
    },

    // Search songs by title
    songsByTitle: async (_: unknown, { title }: { title: string }, context: GraphQLContext) => {
      if (!title) {
        const { data } = await context.supabase
          .from('songs')
          .select('*')
          .order('created_at', { ascending: false });
        return (data || []).map(transformSong);
      }

      const { data, error } = await context.supabase
        .from('songs')
        .select('*')
        .ilike('title', `%${title}%`)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []).map(transformSong);
    },

    // Get songs by user ID (requires auth)
    songsByUserId: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');

      const { data, error } = await context.supabase
        .from('songs')
        .select('*')
        .eq('user_id', context.userId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []).map(transformSong);
    },

    // Get liked songs (requires auth)
    likedSongs: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');

      const { data, error } = await context.supabase
        .from('liked_songs')
        .select('*, songs(*)')
        .eq('user_id', context.userId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      if (!data) return [];

      return data.map((item: { songs: any }) => transformSong(item.songs));
    },

    // Get all products
    products: async (_: unknown, __: unknown, context: GraphQLContext) => {
      const { data, error } = await context.supabase
        .from('products')
        .select('*');

      if (error) throw new Error(error.message);
      return data || [];
    },

    // Get active products with prices
    activeProductsWithPrices: async (_: unknown, __: unknown, context: GraphQLContext) => {
      const { data, error } = await context.supabase
        .from('products')
        .select('*, prices(*)')
        .eq('active', true)
        .eq('prices.active', true)
        .order('metadata->index')
        .order('unit_amount', { foreignTable: 'prices' });

      if (error) throw new Error(error.message);
      return data || [];
    },

    // Get user subscription (requires auth)
    subscription: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');

      const { data, error } = await context.supabase
        .from('subscriptions')
        .select('*, prices(*)')
        .eq('user_id', context.userId)
        .single();

      if (error && error.code !== 'PGRST116') throw new Error(error.message);
      return data || null;
    },

    // Get current user
    user: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.userId) return null;

      const { data, error } = await context.supabase
        .from('users')
        .select('*')
        .eq('id', context.userId)
        .single();

      if (error) throw new Error(error.message);
      
      // Map snake_case to camelCase
      if (data) {
        const userData = data as any;
        return {
          id: userData.id,
          fullName: userData.full_name,
          avatarUrl: userData.avatar_url,
          isSubscribed: userData.is_subscribed ?? false,
        };
      }
      return null;
    },
  },

  Mutation: {
    // Upload a song (requires auth)
    uploadSong: async (
      _: unknown,
      {
        title,
        author,
        songPath,
        imagePath,
      }: {
        title: string;
        author: string;
        songPath: string;
        imagePath: string;
      },
      context: GraphQLContext
    ) => {
      if (!context.userId) throw new Error('Unauthorized');

      const { data, error } = await context.supabase
        .from('songs')
        .insert({
          user_id: context.userId,
          title,
          author,
          song_path: songPath,
          image_path: imagePath,
        } as any)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return transformSong(data);
    },

    // Delete a song (requires auth)
    deleteSong: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (!context.userId) throw new Error('Unauthorized');

      // Verify ownership
      const { data: song } = await context.supabase
        .from('songs')
        .select('user_id')
        .eq('id', id)
        .single();

      if (!song || (song as any).user_id !== context.userId) {
        throw new Error('Unauthorized to delete this song');
      }

      const { error } = await context.supabase.from('songs').delete().eq('id', id);

      if (error) throw new Error(error.message);
      return true;
    },

    // Like a song (requires auth)
    likeSong: async (
      _: unknown,
      { songId }: { songId: string },
      context: GraphQLContext
    ) => {
      if (!context.userId) throw new Error('Unauthorized');

      const { error } = await context.supabase.from('liked_songs').insert({
        user_id: context.userId,
        song_id: songId,
      } as any);

      if (error) throw new Error(error.message);
      return true;
    },

    // Unlike a song (requires auth)
    unlikeSong: async (
      _: unknown,
      { songId }: { songId: string },
      context: GraphQLContext
    ) => {
      if (!context.userId) throw new Error('Unauthorized');

      const { error } = await context.supabase
        .from('liked_songs')
        .delete()
        .eq('user_id', context.userId)
        .eq('song_id', songId);

      if (error) throw new Error(error.message);
      return true;
    },
  },
};
