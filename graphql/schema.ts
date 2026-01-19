export const typeDefs = `#graphql
  type Song {
    id: ID!
    userId: String!
    author: String!
    title: String!
    songPath: String!
    imagePath: String!
    createdAt: String
  }

  type Product {
    id: ID!
    active: Boolean
    name: String
    description: String
    image: String
    metadata: JSON
    prices: [Price!]
  }

  type Price {
    id: ID!
    productId: String
    active: Boolean
    description: String
    unitAmount: Int
    currency: String
    type: String
    interval: String
    intervalCount: Int
    trialPeriodDays: Int
    metadata: JSON
    product: Product
  }

  type Subscription {
    id: ID!
    userId: String!
    status: String
    metadata: JSON
    priceId: String
    quantity: Int
    cancelAtPeriodEnd: Boolean
    created: String!
    currentPeriodStart: String!
    currentPeriodEnd: String!
    endedAt: String
    cancelAt: String
    canceledAt: String
    trialStart: String
    trialEnd: String
    price: Price
  }

  type User {
    id: ID!
    fullName: String
    avatarUrl: String
    isSubscribed: Boolean
  }

  type Query {
    # Songs
    songs: [Song!]!
    song(id: ID!): Song
    songsByTitle(title: String!): [Song!]!
    songsByUserId: [Song!]!
    likedSongs: [Song!]!
    
    # Products & Subscriptions
    products: [Product!]!
    activeProductsWithPrices: [Product!]!
    subscription: Subscription
    
    # User
    user: User
  }

  type Mutation {
    # Songs
    uploadSong(
      title: String!
      author: String!
      songPath: String!
      imagePath: String!
    ): Song!
    
    deleteSong(id: ID!): Boolean!
    
    # Likes
    likeSong(songId: ID!): Boolean!
    unlikeSong(songId: ID!): Boolean!
  }

  scalar JSON
`;
