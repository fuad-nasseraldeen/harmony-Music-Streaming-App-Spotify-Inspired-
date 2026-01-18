// GraphQL client utility for making queries and mutations
export async function graphqlRequest<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0]?.message || 'GraphQL error');
  }

  return result.data;
}

// Example queries and mutations
export const queries = {
  getSongs: `
    query GetSongs {
      songs {
        id
        title
        author
        imagePath
        songPath
        userId
        createdAt
      }
    }
  `,
  getSong: `
    query GetSong($id: ID!) {
      song(id: $id) {
        id
        title
        author
        imagePath
        songPath
        userId
        createdAt
      }
    }
  `,
  searchSongs: `
    query SearchSongs($title: String!) {
      songsByTitle(title: $title) {
        id
        title
        author
        imagePath
        songPath
        userId
        createdAt
      }
    }
  `,
  getLikedSongs: `
    query GetLikedSongs {
      likedSongs {
        id
        title
        author
        imagePath
        songPath
        userId
        createdAt
      }
    }
  `,
  getProducts: `
    query GetProducts {
      activeProductsWithPrices {
        id
        name
        description
        image
        prices {
          id
          unitAmount
          currency
          interval
        }
      }
    }
  `,
};

export const mutations = {
  uploadSong: `
    mutation UploadSong($title: String!, $author: String!, $songPath: String!, $imagePath: String!) {
      uploadSong(title: $title, author: $author, songPath: $songPath, imagePath: $imagePath) {
        id
        title
        author
        imagePath
        songPath
      }
    }
  `,
  deleteSong: `
    mutation DeleteSong($id: ID!) {
      deleteSong(id: $id)
    }
  `,
  likeSong: `
    mutation LikeSong($songId: ID!) {
      likeSong(songId: $songId)
    }
  `,
  unlikeSong: `
    mutation UnlikeSong($songId: ID!) {
      unlikeSong(songId: $songId)
    }
  `,
};
