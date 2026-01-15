# ... bagian atas tetap sama ...
EXPOSE 3000

# Pastikan menunjuk ke server.js, bukan index.js
CMD ["node", "src/server/server.js"]
CMD ["npm", "start"]
