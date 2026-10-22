import { useState } from 'react';
import ProfileModal from './ProfileModal';

export default function ProfileButton() {
    const [showModal, setShowModal] = useState(false);

    const handleClick = () => {
        setShowModal(true);
    };

    const handleClose = () => {
        setShowModal(false);
    };

    return (
        <>
            <button onClick={handleClick}>Profile</button>
            {showModal && <ProfileModal onClose={handleClose} />}
        </>
    );
}

