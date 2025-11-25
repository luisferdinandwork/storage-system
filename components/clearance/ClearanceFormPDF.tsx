// components/clearance/ClearanceFormPDF.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register a font (optional)
Font.register({
  family: 'Roboto',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf',
});

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column' as const,
    backgroundColor: '#FFFFFF',
    padding: 30,
  },
  title: {
    fontSize: 22,
    textAlign: 'center' as const,
    marginBottom: 15,
    fontFamily: 'Roboto',
    fontWeight: 'bold' as const,
  },
  formDetails: {
    marginBottom: 15,
    fontFamily: 'Roboto',
    fontSize: 10,
  },
  detailRow: {
    flexDirection: 'row' as const,
    marginBottom: 3,
  },
  detailLabel: {
    width: 80,
    fontWeight: 'bold' as const,
  },
  table: {
    display: 'flex',
    flexDirection: 'column' as const,
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row' as const,
    minHeight: 20,
  },
  tableColHeader: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
    backgroundColor: '#E0E0E0',
    fontWeight: 'bold' as const,
    fontSize: 9,
  },
  tableCol: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
    fontSize: 8,
  },
  itemCodeCol: {
    width: '15%',
  },
  descriptionCol: {
    width: '45%',
  },
  boxCol: {
    width: '10%',
  },
  locationCol: {
    width: '15%',
  },
  qtyCol: {
    width: '8%',
    textAlign: 'center' as const,
  },
  checkedCol: {
    width: '7%',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  instructions: {
    marginTop: 15,
    marginBottom: 15,
    fontFamily: 'Roboto',
    fontSize: 10,
  },
  signature: {
    marginTop: 30,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    fontSize: 10,
  },
  signatureBox: {
    width: '45%',
    fontSize: 10,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid' as const,
    width: '100%',
    marginBottom: 5,
    marginTop: 20,
  },
  footer: {
    position: 'absolute' as const,
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center' as const,
    fontSize: 8,
    fontFamily: 'Roboto',
    color: '#666',
  },
  checkbox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: '#000',
    borderStyle: 'solid' as const,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold' as const,
    marginBottom: 8,
    fontFamily: 'Roboto',
  },
});

interface ClearanceFormPDFProps {
  form: {
    formNumber: string;
    title: string;
    description: string | null;
    period: string;
  };
  formItems: Array<{
    item: {
      productCode: string;
      description: string;
    };
    stock: {
      box?: {
        boxNumber: string;
        location?: {
          name: string;
        };
      } | null;
    };
    quantity: number;
    condition: string;
  }>;
  user: {
    name: string;
  };
}

export const ClearanceFormPDF: React.FC<ClearanceFormPDFProps> = ({ form, formItems, user }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>FORMULIR PEMBERSIHAN</Text>
      
      <View style={styles.formDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>No. Form:</Text>
          <Text>{form.formNumber}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Tanggal:</Text>
          <Text>{new Date().toLocaleDateString('id-ID')}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Judul:</Text>
          <Text>{form.title}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Periode:</Text>
          <Text>{form.period}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Dibuat oleh:</Text>
          <Text>{user.name}</Text>
        </View>
        {form.description && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Deskripsi:</Text>
            <Text>{form.description}</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.sectionTitle}>ITEM YANG AKAN DIBERSIHKAN:</Text>
      
      <View style={styles.table}>
        {/* Header row */}
        <View style={styles.tableRow}>
          <View style={[styles.tableColHeader, styles.itemCodeCol]}>
            <Text>Kode Item</Text>
          </View>
          <View style={[styles.tableColHeader, styles.descriptionCol]}>
            <Text>Deskripsi</Text>
          </View>
          <View style={[styles.tableColHeader, styles.boxCol]}>
            <Text>Kotak</Text>
          </View>
          <View style={[styles.tableColHeader, styles.locationCol]}>
            <Text>Lokasi</Text>
          </View>
          <View style={[styles.tableColHeader, styles.qtyCol]}>
            <Text>Jml</Text>
          </View>
          <View style={[styles.tableColHeader, styles.checkedCol]}>
            <Text>Centang</Text>
          </View>
        </View>
        
        {/* Data rows */}
        {formItems.map((item, index) => {
          const boxNumber = item.stock.box?.boxNumber || 'N/A';
          const locationName = item.stock.box?.location?.name || 'N/A';
          
          return (
            <View style={styles.tableRow} key={index}>
              <View style={[styles.tableCol, styles.itemCodeCol]}>
                <Text>{item.item.productCode}</Text>
              </View>
              <View style={[styles.tableCol, styles.descriptionCol]}>
                <Text>{item.item.description}</Text>
              </View>
              <View style={[styles.tableCol, styles.boxCol]}>
                <Text>{boxNumber}</Text>
              </View>
              <View style={[styles.tableCol, styles.locationCol]}>
                <Text>{locationName}</Text>
              </View>
              <View style={[styles.tableCol, styles.qtyCol]}>
                <Text>{item.quantity}</Text>
              </View>
              <View style={[styles.tableCol, styles.checkedCol]}>
                <View style={styles.checkbox} />
              </View>
            </View>
          );
        })}
      </View>
      
      <View style={styles.instructions}>
        <Text style={{ fontWeight: 'bold' as const, marginBottom: 5 }}>Petunjuk:</Text>
        <Text>1. Temukan setiap item di lokasi yang ditentukan</Text>
        <Text>2. Verifikasi bahwa item sesuai dengan deskripsi</Text>
        <Text>3. Centang kotak di kolom "Centang" untuk setiap item yang telah diverifikasi</Text>
        <Text>4. Tandatangani di bawah dan unggah formulir yang telah dipindai</Text>
      </View>
      
      <View style={styles.signature}>
        <View style={styles.signatureBox}>
          <Text>Tanda Tangan:</Text>
          <View style={styles.signatureLine} />
        </View>
        
      </View>
      
      <Text style={styles.footer}>Dibuat pada {new Date().toLocaleString('id-ID')}</Text>
    </Page>
  </Document>
);