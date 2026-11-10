# ✦ Carnet de Souhaits — Liste de Noël Chic & Partageable

Une application web de liste de souhaits de Noël à l'esthétique éditoriale (*Vert Sapin profond, Ivoire chaud, Or brossé et Bordeaux*), pensée pour être très simple à utiliser et à partager avec vos proches.

## Fonctionnalités clés

1. **Comparateur Multi-Marchands & Meilleur Prix automatique** :
   - Ajoutez un ou plusieurs sites marchands par cadeau (Fnac, Boulanger, Amazon, Diptyque, etc.).
   - L'application met automatiquement en avant le **Meilleur Prix**, affiche le prix barré, calcule le **pourcentage de réduction (`-25%`)** et permet de copier les **codes promo** en un clic.
2. **Deux vues intégrées (Vue Proches vs Mode Édition)** :
   - **Vue Proches** : Vos proches peuvent filtrer par budget ou catégorie, cliquer sur les liens d'achat et **réserver un cadeau** pour éviter les doublons.
   - **Mode Édition (Anti-Spoiler)** : Vous pouvez ajouter/modifier vos souhaits sans voir quels cadeaux ont été réservés par vos proches (avec une option pour afficher les réservations si besoin).
3. **Remplissage rapide par URL** :
   - Collez l'URL d'un produit lors de l'ajout d'un souhait pour extraire automatiquement la boutique et les métadonnées disponibles.
4. **Partage ultra simple (Zéro base de données complexe)** :
   - **En local** : Lancez `python3 server.py` — toutes les modifications sont sauvegardées directement dans `gifts.json`.
   - **Lien de partage autonome** : Le bouton **« Partager »** génère un lien contenant votre liste encodée, ou vous permet d'exporter `gifts.json` pour un hébergement gratuit (Netlify Drop, GitHub Pages, Vercel).

## Lancement rapide

Dans ce dossier, lancez simplement :

```bash
python3 server.py
```

Puis ouvrez **[http://localhost:8080](http://localhost:8080)** dans votre navigateur.
