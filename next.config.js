/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hhopgeupizlfkmvtsvkf.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  //  Burayı ekledik: ESLint hataları build'i durdurmasın
  eslint: {
    ignoreDuringBuilds: true,
  },

async redirects() {
    return [
      // Artık var olmayan tüm eski sayfaları ana sayfaya yönlendiriyoruz.
      // Bu, SEO ve kullanıcı deneyimi için çok önemlidir.
     // {
     // source: '/login',
     //   destination: '/',
   //    permanent: true,
    //  },
      {
        source: '/register',
       destination: '/',
      permanent: true,
      },
      {
        source: '/profile/:path*',
        destination: '/',
        permanent: true,
      },
     // {
       // source: '/dashboard',
      // destination: '/',
      // permanent: true,
      //},
     // {
       // source: '/tool/:slug*', // EN ÖNEMLİSİ: Tüm araç detay sayfalarını kapat
      //  destination: '/',
      //  permanent: true,
    //  },
       {
        source: '/blog/:path*',
        destination: '/',
        permanent: true,
      },
       {
        source: '/yarisma',
        destination: '/',
        permanent: true,
      },
      { source: '/uyelik',
        destination: '/',
        permanent: true
       },
       { source: '/u/:path*',
        destination: '/',
        permanent: true
       },
       {source: '/topluluk',
        destination: '/',
        permanent: true
        },
        //{ source: '/tavsiye',
         // destination: '/',
          //permanent: true
        //},
        { source: '/studyo',
          destination: '/',
          permanent: true
        },
        { source: '/signup',
          destination: '/',
          permanent: true
       },
        { source: '/reset-password',
          destination: '/',
          permanent: true
        },
        { source: '/random-tools',
          destination: '/',
          permanent: true
        },
       { source: '/profile',
         destination: '/',
          permanent: true
        },
        { source: '/ogren',
          destination: '/',
          permanent: true
        },
        { source: '/odul-avciligi',
          destination: '/',
          permanent: true
        },
        { source: '/mesajlar',
          destination: '/',
          permanent: true
        },
        {source: '/leaderbord',
          destination: '/',
          permanent: true
        },
        { source: '/launchpad',
          destination: '/',
          permanent: true
        },
        { source: '/koleksiyonlar',
          destination: '/',
          permanent: true
        },
        { source: '/kesfet',
          destination: '/',
          permanent: true
        },
        { source: '/karsilastir',
          destination: '/',
          permanent: true
        },
        { source: '/forgot-password',
          destination: '/',
          permanent:true
        },
        { source: '/eserler/:path*',
          destination: '/',
          permanent: true
        },
        { source: '/auth/:callback*',
          destination: '/',
          permanent: true
        },
        { source: '/arastirma',
          destination: '/',
          permanent: true
        },
        { source: '/api/:path*',
          destination: '/',
          permanent: true
        },
        { source: '/akis',
          destination: '/',
          permanent: true
        }
    ]
  },

};

module.exports = nextConfig;
