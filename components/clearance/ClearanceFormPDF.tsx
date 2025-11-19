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
      <Text style={styles.title}>CLEARANCE FORM</Text>
      
      <View style={styles.formDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Form No:</Text>
          <Text>{form.formNumber}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text>{new Date().toLocaleDateString()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Title:</Text>
          <Text>{form.title}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Period:</Text>
          <Text>{form.period}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Generated:</Text>
          <Text>{user.name}</Text>
        </View>
        {form.description && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Description:</Text>
            <Text>{form.description}</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.sectionTitle}>ITEMS TO CLEAR:</Text>
      
      <View style={styles.table}>
        {/* Header row */}
        <View style={styles.tableRow}>
          <View style={[styles.tableColHeader, styles.itemCodeCol]}>
            <Text>Item Code</Text>
          </View>
          <View style={[styles.tableColHeader, styles.descriptionCol]}>
            <Text>Description</Text>
          </View>
          <View style={[styles.tableColHeader, styles.boxCol]}>
            <Text>Box</Text>
          </View>
          <View style={[styles.tableColHeader, styles.locationCol]}>
            <Text>Location</Text>
          </View>
          <View style={[styles.tableColHeader, styles.qtyCol]}>
            <Text>Qty</Text>
          </View>
          <View style={[styles.tableColHeader, styles.checkedCol]}>
            <Text>Check</Text>
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
        <Text style={{ fontWeight: 'bold' as const, marginBottom: 5 }}>Instructions:</Text>
        <Text>1. Locate each item in the specified location</Text>
        <Text>2. Verify the item matches the description</Text>
        <Text>3. Check the box in the "Checked" column for each verified item</Text>
        <Text>4. Sign below and upload the scanned form</Text>
      </View>
      
      <View style={styles.signature}>
        <View style={styles.signatureBox}>
          <Text>Signature:</Text>
          <View style={styles.signatureLine} />
        </View>
        
      </View>
      
      <Text style={styles.footer}>Generated on {new Date().toLocaleString()}</Text>
    </Page>
  </Document>
);