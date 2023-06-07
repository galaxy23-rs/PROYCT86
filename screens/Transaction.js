import React, { Component } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ImageBackground,
  Image,
  Alert,
  ToastAndroid,
  KeyboardAvoidingView
} from "react-native";
import * as Permissions from "expo-permissions";
import { BarCodeScanner } from "expo-barcode-scanner";
import db from "../config";
import firebase from "firebase";

const bgImage = require("../assets/background2.jpg");
const appIcon = require("../assets/appIcon.png");
const appName = require("../assets/appName.png");

export default class TransactionScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      bookId: "",
      studentId: "",
      domState: "normal",
      hasCameraPermissions: null,
      scanned: false,
      bookName: "",
      studentName: ""
    };
  }

  getCameraPermissions = async domState => {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);

    this.setState({
      /*status === "granted" es cierto (true) cuando se le concede permiso al usuario
          status === "granted" es falso (false) cuando no se le concede permiso al usuario
        */
      hasCameraPermissions: status === "granted",
      domState: domState,
      scanned: false
    });
  };

  handleBarCodeScanned = async ({ type, data }) => {
    const { domState } = this.state;

    if (domState === "carroId") {
      this.setState({
        bookId: data,
        domState: "normal",
        scanned: true
      });
    } else if (domState === "clienteId") {
      this.setState({
        studentId: data,
        domState: "normal",
        scanned: true
      });
    }
  };

  handleTransaction = async () => {
    var { carroId, clienteId } = this.state;
    await this.getcarroDetails(carroId);
    await this.getclientetDetails(clienteId);

    var transactionType = await this.checkcarrokAvailability(carroId);
    
         if (!transactionType) {
      this.setState({ carroId: "", clienteId: "" });
       // Solo para usuario Android
      //  ToastAndroid.show("El libro no se encuentra en la base de datos de la biblioteca", ToastAndroid.SHORT);
      Alert.alert("El carro no se encuentra en la base de datos");
    } 
    else if (transactionType === "issue") {
          var { carroName, clienteName } = this.state;
          this.initiateBookIssue(carroId, clienteId, carroName, clienteName);

           // Solo para usuario Android
         //  ToastAndroid.show("Libro emitido al alumno", ToastAndroid.SHORT);

           Alert.alert("Carro emitido al cliente");
        } else {
          var { carroName, clienteName } = this.state;
          this.initiateBookReturn(carroId, clienteId, carroName, clienteName);

          // Solo para usuarios Android           
       /*   ToastAndroid.show(
            "Libro devuelto a la biblioteca",
            ToastAndroid.SHORT
          );*/

          Alert.alert("Libro devuelto a la biblioteca");
        }
      
  };

  getBookDetails = carroId => {
    carroId = carroId.trim();
    db.collection("carro")
      .where("carro_id", "==", carroId)
      .get()
      .then(snapshot => {
        snapshot.docs.map(doc => {
          this.setState({
            carroName: doc.data().carro_details.carro_name
          });
        });
      });
  };

  getStudentDetails = studentId => {
    studentId = studentId.trim();
    db.collection("students")
      .where("student_id", "==", studentId)
      .get()
      .then(snapshot => {
        snapshot.docs.map(doc => {
          this.setState({
            clienteName: doc.data().cliente_details.cliente_name
          });
        });
      });
  };

  checkcarroAvailability = async carroId => {
    const carroRef = await db
      .collection("carro")
      .where("carro_id", "==", carroId)
      .get();

    var transactionType = "";
    if (carroRef.docs.length == 0) {
      transactionType = false;
    } else {
      carroRef.docs.map(doc => {
        //si el libro está disponible, el tipo de transacción será issue
        // de lo contrario será return
        transactionType = doc.data().is_carro_available ? "issue" : "return";
      });
    }

    return transactionType;
  };
  
  
  initiateBookIssue = async (carroId, clienteId, carroName, clienteName) => {
    //añade una transacción
    db.collection("transactions").add({
      cliente_id: clienteId,
      cliente_name: clienteame,
      carro_id: carroId,
      carro_name: carroName,
      date: firebase.firestore.Timestamp.now().toDate(),
      transaction_type: "issue"
    });
    //cambia el estatus del libro
    db.collection("carro")
      .doc(carroId)
      .update({
        is_book_available: false
      });
    //cambia el número de libros emitidos al alumno
    db.collection("cliente")
      .doc(clienteId)
      .update({
        number_of_books_issued: firebase.firestore.FieldValue.increment(1)
      });

    // Actualizar local state
    this.setState({
      carroId: "",
      clienteId: ""
    });
  };

  initiateBookReturn = async (carroId, clienteId, carroName, clienteName) => {
    //añade una transacción
    db.collection("transactions").add({
      cliente_id: clienteId,
      cliente_name: clienteName,
      carro_id: carroId,
      carrp_name: carroName,
      date: firebase.firestore.Timestamp.now().toDate(),
      transaction_type: "return"
    });
    //cambia el estatus del libro
    db.collection("carro")
      .doc(carroId)
      .update({
        is_book_available: true
      });
    //cambia el número de libros emitidos al alumno
    db.collection("cliente")
      .doc(clienteId)
      .update({
        number_of_books_issued: firebase.firestore.FieldValue.increment(-1)
      });

    // Actualizar local state
    this.setState({
      carroId: "",
      clienteId: ""
    });
  };

  render() {
    const { carroId, clienteId, domState, scanned } = this.state;
    if (domState !== "normal") {
      return (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
      );
    }
    return (
        <ImageBackground source={bgImage} style={styles.bgImage}>
          <View style={styles.upperContainer}>
            <Image source={appIcon} style={styles.appIcon} />
            <Image source={appName} style={styles.appName} />
          </View>
          <View style={styles.lowerContainer}>
            <View style={styles.textinputContainer}>
              <TextInput
                style={styles.textinput}
                placeholder={"carro Id"}
                placeholderTextColor={"#FFFFFF"}
                value={carroId}
                onChangeText={text => this.setState({ carroId: text })}
              />
              <TouchableOpacity
                style={styles.scanbutton}
                onPress={() => this.getCameraPermissions("carroId")}
              >
                <Text style={styles.scanbuttonText}>Scan</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.textinputContainer, { marginTop: 25 }]}>
              <TextInput
                style={styles.textinput}
                placeholder={"cliente Id"}
                placeholderTextColor={"#FFFFFF"}
                value={studentId}
                onChangeText={text => this.setState({ clienteId: text })}
              />
              <TouchableOpacity
                style={styles.scanbutton}
                onPress={() => this.getCameraPermissions("clienteId")}
              >
                <Text style={styles.scanbuttonText}>Scan</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.button, { marginTop: 25 }]}
              onPress={this.handleTransaction}
            >
              <Text style={styles.buttonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
     
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  bgImage: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center"
  },
  upperContainer: {
    flex: 0.5,
    justifyContent: "center",
    alignItems: "center"
  },
  appIcon: {
    width: 200,
    height: 200,
    resizeMode: "contain",
    marginTop: 80
  },
  appName: {
    width: 80,
    height: 80,
    resizeMode: "contain"
  },
  lowerContainer: {
    flex: 0.5,
    alignItems: "center"
  },
  textinputContainer: {
    borderWidth: 2,
    borderRadius: 10,
    flexDirection: "row",
    backgroundColor: "#9DFD24",
    borderColor: "#FFFFFF"
  },
  textinput: {
    width: "57%",
    height: 50,
    padding: 10,
    borderColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 3,
    fontSize: 18,
    backgroundColor: "#5653D4",
    
    color: "#FFFFFF"
  },
  scanbutton: {
    width: 100,
    height: 50,
    backgroundColor: "#9DFD24",
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    justifyContent: "center",
    alignItems: "center"
  },
  scanbuttonText: {
    fontSize: 24,
    color: "#0A0101",
  },
  button: {
    width: "43%",
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F48D20",
    borderRadius: 15
  },
  buttonText: {
    fontSize: 24,
    color: "#FFFFFF",
  }
});
