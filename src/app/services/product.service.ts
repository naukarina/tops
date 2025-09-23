import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private firestore: Firestore = inject(Firestore);
  private productsCollection = collection(this.firestore, 'products');

  getProducts(): Observable<Product[]> {
    return collectionData(this.productsCollection, { idField: 'id' }) as Observable<Product[]>;
  }

  getProduct(id: string): Observable<Product> {
    const productDoc = doc(this.firestore, `products/${id}`);
    return docData(productDoc, { idField: 'id' }) as Observable<Product>;
  }

  addProduct(product: Product) {
    return addDoc(this.productsCollection, product);
  }

  updateProduct(id: string, data: Partial<Product>) {
    const productDoc = doc(this.firestore, `products/${id}`);
    return updateDoc(productDoc, data);
  }

  deleteProduct(id: string) {
    const productDoc = doc(this.firestore, `products/${id}`);
    return deleteDoc(productDoc);
  }
}
