//import React from 'react'
import CardHeader from '../CardView/CardHeader'
//import Card from '../CardView/Card'
//import { useUtility } from '../../context/utility.context'


export default function Contacts() {
//  const {myCardRecords}=useUtility()
  return (
    <div className="tab-pane fade show active" id="contacts" role="tabpanel" aria-labelledby="contacts-tab">
                       
                           <div className="main-cards">
                               {/* <!--main cards header start--> */}
                             <CardHeader/>
                               {/* <!--main cards header end--> */}
   
                            
                          
                           </div>
    </div>
  )
}
