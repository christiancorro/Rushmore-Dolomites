# Journal
### Remainders
1. Problems encountered
2. Solutions explored
3. Log your successes
4. Things to revisit later
5. Ambitions and goals
6. Lessons learned

* **Idea**: 
* **Problema**:
* **Soluzione**:
* **Refactoring**:
* **Obiettivo**:

## 5 novembre 2020
* **Problema**: generazione procedurale completata, con una heightmap di 60x60 (3600 cubi) le prestazioni non sono soddisfacenti. E non è ancora stato aggiunto nient'altro! Con una risoluzione così bassa è impossibile inserire l'immagine dalla webcam. Serve una risoluzione di almeno di 200x200 (40 mila cubi).
\
**Soluzione**: Tento con [InstancedMesh](https://raw.githack.com/mrdoob/three.js/dev/examples/webgl_instancing_scatter.html).

## 4 novembre 2020
* **Idea 1**: __*Scultura volto con webcam su monti generati proceduralmente.*__ 
\
Piccolo scenario montuoso in prospettiva ortogonale mediante una heightmap, avendo in mente di mappare la superficie del monte con i livelli di grigio dell'immagine della webcam. L'obiettivo sarebbe quello di creare delle piccole scene inscritte in un cubo aventi nei monti la scultura del proprio volto. Da ponderare meglio. Possibilità di Download GLTF per stampa 3D? 
\
**Animazioni**: fauna (uccelli), effetti ambientali (nuvole,...), ecc.
\
**Problema**: Dubbi sulla generazione con heightmap e poi modifica con analisi dell'immagine. Come garantire spazio sufficiente per il volto? Invece dei livelli di grigio della webcam forse sarebbe meglio inserire un sistema di face recognition? La densità dei cubi deve essere sufficiente a permettere un livello di dettaglio del volto soddisfacente.
\
**Ispirazione**: Costruire una sorta di Monte Rushmore ambientato nelle Dolomiti.
\
\
[<img src="img/journal-images/voxel-terrain.jpg" alt="Voxel Terrain" width="450">](https://twitter.com/MarcioAugust/status/1116541756596793344/photo/1)
[<img src="img/journal-images/voxel-terrain2.jpg" alt="Voxel Terrain" width="450">](https://github.com/niezbop/Voxel-Terrain-Generation)
[<img src="img/journal-images/Monte Rushmore.jpg" alt="Voxel Terrain" width="450">](https://en.wikipedia.org/wiki/Mount_Rushmore)
[<img src="img/journal-images/Lago di Carezza.jpg" alt="Voxel Terrain" width="450">](https://it.wikipedia.org/wiki/Lago_di_Carezza)

* **Idea 2**: __*Generazione palla di neve da webcam*__ 
\
Si disegna a mano una heightmap. La si mostra alla webcam. Viene generato il terreno che è inserito in una palla di neve. Esplorazione di effetti particellari (neve, ...).

L'idea 1, forse, mi aggrada di più.

* **Da fare:**
    - [ ] **Costruire** terreno proceduralmente
    - [ ] **Acquisire** immagine da webcam
    - [ ] **Trasformare** i cubi del monte in base all'immagine (se c'è tempo pensare ad una soluzione con face recognition, forse)
